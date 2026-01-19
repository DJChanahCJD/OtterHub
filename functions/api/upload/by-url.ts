import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";
import { FileMetadata, FileTag } from "../../utils/types";

/**
 * 通过 URL 远程上传文件
 */
// TODO: 是否支持分片上传？
export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const { url, fileName, isNsfw } = await request.json();

        if (!url) {
            return fail('No URL provided', 400);
        }

        // 获取远程文件内容
        const response = await fetch(url);
        if (!response.ok) {
            return fail(`Failed to fetch remote file: ${response.statusText}`, 400);
        }

        const blob = await response.blob();
        const finalFileName = (fileName || 'remote_file').substring(0, 100);
        const fileSize = blob.size;

        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        const metadata: FileMetadata = {
            fileName: finalFileName,
            fileSize,
            uploadedAt: Date.now(),
            liked: false,
            tags: isNsfw ? [FileTag.NSFW] : [],
        };

        const key = await dbAdapter.uploadFile(blob, metadata);
        return ok({ key, fileSize });
    } catch (error: any) {
        console.error('Remote upload error:', error);
        return fail(`Failed to upload remote file: ${error.message}`, 500);
    }
}
