import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";
import { FileMetadata, FileTag } from "@shared/types";

// 单个文件上传
export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            return fail('No file uploaded', 400);
        }

        const fileName = uploadFile.name.substring(0, 100);  //  不超过100个字符 
        const fileSize = uploadFile.size;

        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        const isNsfw = formData.get('nsfw') === 'true';
        console.log(formData);

        const metadata: FileMetadata = {
            fileName,
            fileSize,
            uploadedAt: Date.now(),
            liked: false,
            tags: isNsfw ? [FileTag.NSFW] : [],
        }

        // console.log('Uploading file:', fileName, fileSize);
        const { key } = await dbAdapter.uploadFile(uploadFile, metadata);
        return ok(key);
    } catch (error: any) {
        console.error('Upload error:', error);
        return fail(`Failed to upload file: ${error.message}`, 500);
    }
}