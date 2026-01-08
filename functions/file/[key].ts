// functions/file/[key].ts
import { DBAdapterFactory } from "../utils/db-adapter";

// https://developers.cloudflare.com/pages/functions/api-reference/#onrequests
export async function onRequestGet({ env, params, request }: any) {
  const db = DBAdapterFactory.getAdapter(env);
  const key = params.key;

  // Range 请求直接返回，不缓存，不修改 Response
  if (request.headers.has('Range')) {
    console.log('[File] Range request detected, bypassing cache');
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

  // 非 Range 请求可以缓存
  if (response.ok) {
    // 先克隆原始响应，确保 body 流可以被多次读取
    const clonedResponse = response.clone();
    const cachedResp = new Response(clonedResponse.body, clonedResponse);
    await cache.put(cacheKey, cachedResp.clone());
    console.log('Cache stored:', params.key);
    return cachedResp;
  }

  return response;
}


