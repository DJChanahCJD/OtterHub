
import { deleteCache, deleteFileCache } from "../../../utils/cache";
import { fail, ok } from "../../../utils/common";
import { DBAdapterFactory } from "../../../utils/db-adapter";
import { CF, trashPrefix } from "../../../utils/types";

const expirationTtl = 30 * 24 * 60 * 60; // 30 days in seconds

export async function onRequestPost({ env, params, request }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const key = params.key;

    console.log('Move file to trash:', key);

    // 1. 获取原文件元数据
    const item = await db.getPublicMetadata(key);
    if (!item) {
      return fail('File not found', 404);
    }

    // 2. 将文件 Key 复制到 trash: 前缀
    const trashKey = `${trashPrefix}${key}`;
    const kv = env[CF.KV_NAME];
    
    // 设置 30 天过期
    await kv.put(trashKey, item.value || "", {
      metadata: item.metadata,
      expirationTtl,
    });
    console.log('File moved to trash:', trashKey);

    // 3. 仅从 KV 中删除原文件记录 (保留 R2/TG 文件内容)
    await kv.delete(key);
    
    // 删除缓存
    const url = new URL(request.url);
    await deleteCache(request);
    await deleteFileCache(url.origin, key);

    return ok(key, 'File moved to trash');
  } catch (error: any) {
    console.error('Move to trash error:', error);
    return fail(`Failed to move file to trash: ${error.message}`, 500);
  }
}
