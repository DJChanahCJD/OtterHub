// functions/file/[key].ts
import { DBAdapterFactory } from "@utils/db-adapter";
import { fail } from "@utils/common";
import {
  getFromCache,
  putToCache,
} from "@utils/cache";

export async function onRequestGet({ env, params, request }: any) {
  const db = DBAdapterFactory.getAdapter(env);
  const key = params.key;

  const item = await db.getFileMetadataWithValue?.(key);
  if (!item) return fail("File not found", 404);

  // Range 请求：明确不缓存
  if (request.headers.has("Range")) {
    return db.get(key, request);
  }

  const cached = await getFromCache(request);
  if (cached) return cached;

  const resp = await db.get(key, request);
  await putToCache(request, resp, "file");

  return resp;
}