import { fail, ok } from "../utils/common";
import { DBAdapterFactory } from "../utils/db-adapter";

// https://developers.cloudflare.com/pages/functions/api-reference/#onrequests
export async function onRequestGet({ env, params }: any) {
  const key = params.key;
  const db = DBAdapterFactory.getAdapter(env);

  const file = await db.get(key);
  return file;
}

export async function onRequestDelete({ env, params }: any) {
  try {
    const db = DBAdapterFactory.getAdapter(env);
    const isDeleted = await db.delete(params.key);
    if (!isDeleted) {
      return fail('Failed to delete file', 404);
    }
    return ok(params.key, 'File deleted successfully');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return error(`Failed to delete file: ${error.message}`, 500);
  }
}


