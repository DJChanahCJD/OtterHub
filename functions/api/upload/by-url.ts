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

        if (!response.body) {
            return fail('Empty response body from remote URL', 502);
        }

        const finalFileName = (fileName || 'remote_file').substring(0, 100);
        // 尝试从 headers 获取文件大小，如果没有则设为 0（流式上传可能不知道大小）
        const fileSize = parseInt(response.headers.get('content-length') || '0');

        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        const metadata: FileMetadata = {
            fileName: finalFileName,
            fileSize,
            uploadedAt: Date.now(),
            liked: false,
            tags: isNsfw ? [FileTag.NSFW] : [],
        };

        // 使用流式上传，避免 Blob 在 Cloudflare Pages 上的兼容性问题及大文件内存压力
        const { key } = await dbAdapter.uploadStream(response.body, metadata);
        return ok({ key, fileSize });
    } catch (error: any) {
        console.error('Remote upload error:', error);
        return fail(`Failed to upload remote file: ${error.message}`, 500);
    }
}
