
import { deleteCache, deleteFileCache } from "../../utils/cache";
import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";

export async function onRequestPost({ env, params, request }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const key = params.key;

    // 硬删除
    const { isDeleted } = await db.delete(key);
    if (!isDeleted) {
      return fail('Failed to delete file', 404);
    }

    // 删除缓存
    const url = new URL(request.url);
    await deleteCache(request);
    await deleteFileCache(url.origin, key);

    return ok(key, 'File permanently deleted');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return fail(`Failed to delete file: ${error.message}`, 500);
  }
}
