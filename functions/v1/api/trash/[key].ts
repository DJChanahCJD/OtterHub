
import { failV1 } from "@utils/common";
import { DBAdapterFactory } from "@utils/db-adapter";

export async function onRequestGet({ env, params, request }: any) {
  const trashKey = params.key;

  try {
    const db = DBAdapterFactory.getAdapter(env);

    return await db.get(trashKey, request);
  } catch (error: any) {
    console.error('Fetch trash file error:', error);
    return failV1(`Failed to fetch trash file: ${error.message}`, 500);
  }
}
