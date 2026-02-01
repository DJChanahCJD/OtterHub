
import { fail, ok } from "@utils/common";
import { DBAdapterFactory } from "@utils/db-adapter";

export async function onRequestPost({ env, params }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const trashKey = params.key; // Original key, e.g., 'trash:img:xxx'

    // 使用统一的 DBAdapter 处理还原逻辑
    await db.restoreFromTrash(trashKey);

    return ok(trashKey, 'File restored successfully');
  } catch (error: any) {
    console.error('Restore file error:', error);
    return fail(`Failed to restore file: ${error.message}`, 500);
  }
}
