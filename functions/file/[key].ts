// functions/file/[key].ts
import { fail, ok } from "../utils/common";
import { DBAdapterFactory } from "../utils/db-adapter";

// https://developers.cloudflare.com/pages/functions/api-reference/#onrequests
export async function onRequestGet({ env, params, request }: any) {
  const db = DBAdapterFactory.getAdapter(env);
  const key = params.key;

  // Range 请求不缓存
  if (request.headers.has('Range')) {
    return db.get(key, request);
  }

  console.log('Cache key:', request.url);
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) {
    console.log('Cache hit:', params.key);
    return cached;
  }

  const response = await db.get(key, request);

  if (response.ok) {
    // 先克隆原始响应，确保 body 流可以被多次读取
    const clonedResponse = response.clone();
    const cachedResp = new Response(clonedResponse.body, clonedResponse);
    cachedResp.headers.set('Cache-Control', 'public, max-age=3600');
    await cache.put(cacheKey, cachedResp.clone());
    console.log('Cache stored:', params.key);
    return cachedResp;
  }

  return response;
}


