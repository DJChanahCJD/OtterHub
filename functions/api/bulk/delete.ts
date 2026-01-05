import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";

export async function onRequestPost(context: any) {
    const { env, request } = context;
    const { ids: keys } = await request.json();
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return fail('Invalid or empty keys array');
    }
    // TODO: 实现批量删除逻辑
    // Please use kv.namespaces.bulk_delete instead
    const db = DBAdapterFactory.getAdapter(env);
    const isDeleted = await db.bulkDelete(keys);
    if (!isDeleted) {
        return fail('Failed to delete files', 404);
    }
    return ok(keys, 'Files deleted successfully');
}