import { DBAdapterFactory } from "../utils/db-adapter";
import { checkAuthOrFail } from "../utils/auth";
import { fail } from "../utils/common";

export async function onRequestGet({ env, params, request }: any) {
  const db = DBAdapterFactory.getAdapter(env);
  const key = params.key;

  // 1. 读取元数据
  const meta = await db.getPublicMetadata?.(key);
  if (!meta) {
    return fail(`File not found: ${key}`, 404);
  }

  // 2. 访问控制
  const authError = checkAuthOrFail(
    meta.metadata.tags,
    request,
    env
  );
  if (authError) return authError;

  // 3. Range 请求：不缓存
  if (request.headers.has("Range")) {
    return db.get(key, request);
  }

  // 4. Cache
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const resp = await db.get(key, request);

  if (resp.ok) {
    await cache.put(cacheKey, resp.clone());
  }

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
