/* -------------------------------------------------- */
/* Minimal CacheStorage SWR Cache (TTL + Dedup) */
/* -------------------------------------------------- */

const CACHE_NAME = 'otter-cache-v1';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

// in-flight 请求去重（读 + 写 共用）
const inflight = new Map<string, Promise<any>>();

const now = () => Date.now();

/** 构造稳定 Request（避免 fake url 字符串） */
const req = (key: string) =>
  new Request(`https://cache.local/${encodeURIComponent(key)}`);

/** 从 Response header 读取过期时间 */
const getExpiry = (res: Response) =>
  Number(res.headers.get('x-expiry') || 0);

/** 写入缓存 */
async function put<T>(key: string, data: T, ttl: number) {
  const cache = await caches.open(CACHE_NAME);

  const res = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'x-expiry': String(now() + ttl)
    }
  });

  await cache.put(req(key), res);
}

/**
 * SWR: 立即返回旧数据，同时后台更新
 */
async function revalidate<T>(
  key: string,
  fetcher: () => Promise<T | null>,
  ttl: number
) {
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      const fresh = await fetcher();
      if (fresh != null) await put(key, fresh, ttl);
      return fresh;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/**
 * 核心缓存函数
 * - 命中未过期 → 直接返回
 * - 命中已过期 → 返回旧数据 + 后台刷新
 * - 未命中 → fetch 并缓存
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T | null>,
  ttl: number = DEFAULT_TTL
): Promise<T | null> {

  // 读缓存也做 dedup
  if (inflight.has('read:' + key)) return inflight.get('read:' + key)!;

  const readPromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(req(key));

    // --- 未命中 ---
    if (!res) return revalidate(key, fetcher, ttl);

    const expiry = getExpiry(res);
    const data = await res.json() as T;

    // --- 未过期 ---
    if (expiry > now()) return data;

    // --- 过期 → SWR ---
    revalidate(key, fetcher, ttl); // 不 await
    return data;
  })();

  inflight.set('read:' + key, readPromise);
  readPromise.finally(() => inflight.delete('read:' + key));

  return readPromise;
}
