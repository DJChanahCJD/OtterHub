import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";
import { CF, trashPrefix } from "../../utils/types";

const expirationTtl = 30 * 24 * 60 * 60; // 30 days in seconds
export async function onRequestPost({ env, params, request }: any) {
  try {
    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "1";
    const db = DBAdapterFactory.getAdapter(env);

    console.log('Delete file:', params.key, 'permanent:', permanent);

    // 软删除逻辑
    if (!permanent) {
      // 1. 获取原文件元数据
      const item = await db.getPublicMetadata(params.key);
      if (!item) {
        return fail('File not found', 404);
      }

      // 2. 将文件 Key 复制到 trash: 前缀
      const trashKey = `${trashPrefix}${params.key}`;
      const kv = env[CF.KV_NAME];
      
      // 设置 30 天过期
      await kv.put(trashKey, item.value || "", {
        metadata: item.metadata,
        expirationTtl,
      });

    }
    
    // 3. 删除原 Key (继续向下执行)
    const isDeleted = await db.delete(params.key);
    if (!isDeleted) {
      return fail('Failed to delete file', 404);
    }

    // 删除缓存
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    await cache.delete(cacheKey);

    return ok(params.key, permanent ? 'File permanently deleted' : 'File moved to trash');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return fail(`Failed to delete file: ${error.message}`, 500);
  }
}