import { ok, fail } from "./common";

// 不应该转发的请求头（敏感信息）
export const BLOCKED_HEADERS = [
  "host",
  "cookie",
  "authorization",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
];

// 只允许转发的响应头
export const ALLOWED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-disposition",
  "cache-control",
  "etag",
  "last-modified",
  "accept-ranges",
  "content-range",
  "expires",
  "pragma",
];

/**
 * 验证 URL 是否合法
 * 防止 SSRF 攻击，阻止访问内网地址和非法协议
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // 只允许 http 和 https 协议
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // 阻止访问 localhost 和回环地址
    const isLocalhost = [
      "localhost",
      "127.0.0.1",
      "[::1]",
      "0.0.0.0",
      "::",
    ].includes(hostname);

    // 阻止访问内网地址（私有 IP 范围）
    const isPrivateNetwork = [
      /^10\./, // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./, // 192.168.0.0/16
      /^127\./, // 127.0.0.0/8
      /^169\.254\./, // 169.254.0.0/16 (link-local)
    ].some((regex) => regex.test(hostname));

    // 阻止访问本地域名
    const isLocalDomain =
      hostname.endsWith(".local") ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".internal");

    if (isLocalhost || isPrivateNetwork || isLocalDomain) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 过滤请求头，移除敏感信息
 */
export function filterRequestHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (!BLOCKED_HEADERS.includes(key.toLowerCase())) {
      result[key] = value;
    }
  });
  return result;
}

/**
 * 过滤响应头，只转发安全的头
 */
export function filterResponseHeaders(headers: Headers): Headers {
  const newHeaders = new Headers();
  headers.forEach((value, key) => {
    if (ALLOWED_RESPONSE_HEADERS.includes(key.toLowerCase())) {
      newHeaders.set(key, value);
    }
  });
  return newHeaders;
}

/**
 * 处理流式响应（用于图片、视频等大文件）
 */
export function handleStreamResponse(response: Response): Response {
  // 复制过滤后的响应头
  const filteredHeaders = filterResponseHeaders(response.headers);

  // 直接返回流式响应，不缓冲整个响应体
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: filteredHeaders,
  });
}

/**
 * 处理 JSON 响应
 */
export async function handleJsonResponse(response: Response): Promise<Response> {
  try {
    const data = await response.json();
    return ok(data, "Success", response.status);
  } catch (e) {
    return fail("Failed to parse JSON response", 502);
  }
}

/**
 * 处理文本响应
 */
export async function handleTextResponse(
  response: Response,
  contentType: string,
): Promise<Response> {
  try {
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (e) {
    return fail("Failed to read text response", 502);
  }
}

/**
 * 发起 GET 代理请求
 * @param urlString 目标 URL
 * @param customHeaders 自定义请求头
 * @param timeout 超时时间（毫秒），默认 60000ms
 */
export async function proxyGetRequest(
  urlString: string,
  customHeaders?: Record<string, string>,
  timeout: number = 60000,
): Promise<Response> {
  // 验证 URL
  if (!isValidUrl(urlString)) {
    return fail(
      "Invalid or blocked URL. Private and local addresses are not allowed.",
      403,
    );
  }

  // 准备请求头
  const requestHeaders = new Headers(
    Object.entries(customHeaders || {}).filter(([, value]) => typeof value === "string")
  );

  // 设置默认的 User-Agent
  requestHeaders.set("User-Agent", requestHeaders.get("User-Agent") || "Mozilla/5.0 (compatible; OtterHub Proxy/1.0)");

  // 准备请求配置
  const fetchOptions: RequestInit = {
    method: "GET",
    headers: requestHeaders,
    redirect: "follow", // 自动跟随重定向
  };

  // 设置超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;

  // 发起请求
  let response: Response;
  try {
    response = await fetch(urlString, fetchOptions);
    clearTimeout(timeoutId);
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      return fail(`Request timeout (${timeout}ms)`, 504);
    }
    return fail(`Failed to fetch: ${e.message || "Unknown error"}`, 502);
  }

  // 检查响应状态
  if (!response.ok && response.status >= 500) {
    return fail(
      `Upstream server error: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  // 获取内容类型
  const contentType = response.headers.get("content-type") || "";

  // 如果是图片、视频、音频等二进制文件，使用流式响应
  if (
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/") ||
    contentType.startsWith("application/octet-stream")
  ) {
    return handleStreamResponse(response);
  }

  // 如果是 JSON 响应
  if (contentType.includes("application/json")) {
    return await handleJsonResponse(response);
  }

  // 如果是文本响应（HTML, CSS, JS, XML 等）
  if (
    contentType.includes("text/") ||
    contentType.includes("application/xml") ||
    contentType.includes("text/xml") ||
    contentType.includes("application/javascript") ||
    contentType.includes("application/xhtml+xml")
  ) {
    return await handleTextResponse(response, contentType);
  }

  // 其他类型，使用流式传输
  return handleStreamResponse(response);
}

export function getProxyUrl(origin: string, targetUrl: string) {
  return `${origin}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * 获取壁纸专用的代理 URL
 */
export function getWallpaperProxyUrl(origin: string, targetUrl: string) {
  return `${origin}/api/providers/wallpaper/proxy?url=${encodeURIComponent(targetUrl)}`;
}