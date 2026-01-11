import { fail } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";
import { CF, FileMetadata, FileTag, MAX_CHUNK_SIZE } from "../../utils/types";

// 单个文件上传
export async function onRequestPost(context: any) {
    const { request, env } = context;
    const isOverLimit = await checkFileCountLimit(env);
    if (isOverLimit) {
        return fail('File count exceeds limit, please try again later', 400);
    }

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            return fail('No file uploaded', 400);
        }

        if (uploadFile.size > MAX_CHUNK_SIZE) {
            return fail(`File size exceeds ${MAX_CHUNK_SIZE / (1024 * 1024)}MB limit`, 400);
        }

        const fileName = uploadFile.name.substring(0, 100);  //  不超过100个字符 
        const fileSize = uploadFile.size;

        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        const isNsfw = formData.get('nsfw') === 'true';
        console.log(formData);

        const metadata : FileMetadata = {
            fileName,
            fileSize,
            uploadedAt: Date.now(),
            liked: false,
            tags: isNsfw ? [FileTag.NSFW] : [],
        }

        // console.log('Uploading file:', fileName, fileSize);
        return await dbAdapter.uploadFile(uploadFile, metadata);
    } catch (error: any) {
        console.error('Upload error:', error);
        return fail(`Failed to upload file: ${error.message}`, 500);
    }
}

/**
 * 检查文件数量是否超过限制
 * @param env Cloudflare环境变量
 * @param maxFiles 最大文件数量
 * @returns 是否超过限制
 */
async function checkFileCountLimit(
  env: any,
  maxFiles: number = 100,
): Promise<boolean> {
  try {
    const kv = env[CF.KV_NAME];
    const list = await kv.list({ limit: maxFiles });
    return list.keys.length >= maxFiles;
  } catch (error) {
    console.error("检查文件数量失败:", error);
    return false;
  }
}