import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";

// 只支持 POST 请求进行删除
export async function onRequestPost({ env, params, request }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const isDeleted = await db.delete(params.key);
    if (!isDeleted) {
      return fail('Failed to delete file', 404);
    }

    // 删除缓存
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    await cache.delete(cacheKey);

    return ok(params.key, 'File deleted successfully');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return fail(`Failed to delete file: ${error.message}`, 500);
  }
}

// 处理其他 HTTP 方法（GET, HEAD 等），返回 405 Method Not Allowed
export async function onRequest({ env, params, request }: any) {
  return fail('Method not allowed. Use POST to delete files.', 405);
}