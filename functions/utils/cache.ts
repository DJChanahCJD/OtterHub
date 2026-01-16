// functions/utils/cache.ts
import { trashPrefix, FileMetadata } from "./types";

/**
 * 缓存配置常量
 */
export const CACHE_CONFIG = {
  file: {
    maxAge: 86400 * 7,     // 7 天
  },
  thumb: {
    maxAge: 86400 * 1,     // 1 天
  },
  api: {
    maxAge: 3600,          // 1 小时
  },
};


export function createCacheKey(request: Request): Request {
  const url = new URL(request.url);
  // 只缓存 GET
  return new Request(url.toString(), {
    method: "GET",
  });
}

export async function getFromCache(
  request: Request
): Promise<Response | null> {
  const cache = caches.default;
  const key = createCacheKey(request);
  return cache.match(key);
}

export async function putToCache(
  request: Request,
  response: Response,
  type: keyof typeof CACHE_CONFIG
) {
  if (!response.ok) return;

  const cache = caches.default;
  const key = createCacheKey(request);

  const maxAge = CACHE_CONFIG[type].maxAge;

  const cachedResp = new Response(response.body, response);
  cachedResp.headers.set(
    "Cache-Control",
    `public, max-age=${maxAge}`
  );

  await cache.put(key, cachedResp);
}

export async function deleteCache(request: Request) {
  const cache = caches.default;
  const key = createCacheKey(request);
  await cache.delete(key);
}

/**
 * 删除文件访问缓存（/file/:key）
 */
export async function deleteFileCache(origin: string, key: string) {
  const cache = caches.default;
  const url = `${origin}/file/${key}`;
  const req = new Request(url, { method: "GET" });
  await cache.delete(req);
}