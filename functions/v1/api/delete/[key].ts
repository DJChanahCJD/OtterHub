
import { deleteCache, deleteFileCache } from "@utils/cache";
import { failV1, okV1 } from "@utils/common";
import { DBAdapterFactory } from "@utils/db-adapter";
import { API_VERSION } from "@utils/types";

export async function onRequestPost({ env, params, request }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const key = params.key;

    // 硬删除
    const { isDeleted } = await db.delete(key);
    if (!isDeleted) {
      return failV1('Failed to delete file', 404);
    }

    // 删除缓存
    const url = new URL(request.url);
    await deleteCache(request);
    await deleteFileCache(url.origin, key, API_VERSION.V1);

    return okV1(key, 'File permanently deleted');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return failV1(`Failed to delete file: ${error.message}`, 500);
  }
}
