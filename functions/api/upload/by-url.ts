// functions/api/upload/by-url.ts
import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";
import { FileMetadata, FileTag } from "../../utils/types";
import { proxyGet } from "../../utils/proxy";

/**
 * 通过 URL 远程上传文件
 */
export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const { url, fileName, isNsfw } = await request.json();

        if (!url) {
            return fail('No URL provided', 400);
        }

        // 使用重构后的代理请求，自动处理不同站点的防盗链
        const response = await proxyGet(url);
        
        if (!response.ok) {
            return fail(`Failed to fetch remote file: Status ${response.status}`, response.status);
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

        const { key } = await dbAdapter.uploadFile(blob, metadata);
        return ok({ key, fileSize });
    } catch (error: any) {
        console.error('Remote upload error:', error);
        return fail(`Failed to upload remote file: ${error.message}`, 500);
    }
}
