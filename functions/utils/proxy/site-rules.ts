// funcitons/utils/proxy/site-rules.ts
// 站点规则配置
export type SiteRule = {
  match: (url: URL) => boolean;
  headers: Record<string, string>;
};

const DEFAULT_UA = "Mozilla/5.0 (compatible; OtterHub Proxy/1.0)";

export const SITE_RULES: SiteRule[] = [
  {
    // Bing 图片防盗链处理
    match: (u) => u.hostname.includes("bing.com"),
    headers: {
      Referer: "https://www.bing.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  },
  {
    // Pixiv 相关防盗链处理
    match: (u) =>
      ["pximg.net", "pixiv.net", "pixiv.re"].some((h) => u.hostname.includes(h)),
    headers: {
      Referer: "https://www.pixiv.net/",
    },
  },
  {
    // Wallhaven 图片代理规则
    match: (u) => u.hostname.includes("wallhaven.cc"),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  },
];

/**
 * 根据 URL 获取对应站点的请求头
 */
export function resolveSiteHeaders(url: URL) {
  const rule = SITE_RULES.find((r) => r.match(url));
  return {
    "User-Agent": DEFAULT_UA,
    ...(rule?.headers ?? {}),
  };
}
