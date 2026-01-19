
import { deleteCache, deleteFileCache } from "../../../utils/cache";
import { fail, ok } from "../../../utils/common";
import { DBAdapterFactory } from "../../../utils/db-adapter";

export async function onRequestPost({ env, params, request }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const key = params.key;

    // 使用统一的 DBAdapter 处理移入回收站逻辑
    await db.moveToTrash(key);

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
