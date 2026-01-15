
import { fail, ok } from "../../utils/common";
import { CF, trashPrefix } from "../../utils/types";

export async function onRequestPost({ env, params }: any) {
  try {
    const trashKey = params.key; // Original key, e.g., 'trash:img:xxx'
    const kv = env[CF.KV_NAME];

    // 1. Check if file exists in trash
    const { value, metadata } = await kv.getWithMetadata(trashKey);
    
    if (!metadata) {
       return fail('File not found in trash', 404);
    }

    // 2. Restore file (remove expiration)
    await kv.put(trashKey.replace(trashPrefix, ""), value || "", {
      metadata: metadata,
    });

    // 3. Delete from trash
    await kv.delete(trashKey);

    return ok(trashKey, 'File restored successfully');
  } catch (error: any) {
    console.error('Restore file error:', error);
    return fail(`Failed to restore file: ${error.message}`, 500);
  }
}
