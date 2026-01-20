// functions/utils/proxy/index.ts
import { safeFetch } from "./fetch";
import { resolveSiteHeaders } from "./site-rules";
import { filterResponseHeaders } from "./headers";

export * from "./url-guard";
export * from "./headers";
export * from "./site-rules";

/**
 * 统一代理 GET 请求入口
 * @param targetUrl 目标 URL
 * @param extraHeaders 额外的自定义请求头
 */
export async function proxyGet(
  targetUrl: string,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = new URL(targetUrl);
  const siteHeaders = resolveSiteHeaders(url);

  const response = await safeFetch(targetUrl, {
    ...siteHeaders,
    ...extraHeaders,
  });

  return response;
}

/**
 * 处理流式响应的辅助函数（用于透传过滤后的响应）
 */
export function handleStreamResponse(response: Response): Response {
  const filteredHeaders = filterResponseHeaders(response.headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: filteredHeaders,
  });
}

/**
 * 获取通用代理 URL
 */
export function getProxyUrl(origin: string, targetUrl: string) {
  return `${origin}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * 获取壁纸专用的代理 URL
 */
export function getWallpaperProxyUrl(origin: string, targetUrl: string) {
  return `${origin}/api/providers/wallpaper/proxy?url=${encodeURIComponent(targetUrl)}`;
}
