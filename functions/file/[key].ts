// functions/file/[key].ts
import { DBAdapterFactory } from "../utils/db-adapter";
import { checkAuthOrFail } from "../utils/auth";
import { fail } from "../utils/common";
import {
  getFromCache,
  putToCache,
} from "../utils/cache";

export async function onRequestGet({ env, params, request }: any) {
  const db = DBAdapterFactory.getAdapter(env);
  const key = params.key;

  const meta = await db.getPublicMetadata?.(key);
  if (!meta) return fail("File not found", 404);

  const authError = checkAuthOrFail(meta.metadata.tags, request, env);
  if (authError) return authError;

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

// export async function onRequestHead({ env, params, request }: any) {
//   const db = DBAdapterFactory.getAdapter(env);
//   const key = params.key;

//   const meta = await db.getPublicMetadata?.(key);
//   if (!meta) {
//     return fail(`File not found: ${key}`, 404);
//   }

//   const authError = checkAuthOrFail(
//     meta.metadata.tags,
//     request,
//     env
//   );
//   if (authError) return authError;

//   return db.get(key, request);
// }
