import { isValidUrl } from "./url-guard";
import { filterRequestHeaders } from "./headers";

/**
 * 安全的 fetch 实现，包含超时控制和 SSRF 检查
 */
export async function safeFetch(
  url: string,
  headers: Record<string, string>,
  timeout = 60000,
): Promise<Response> {
  if (!isValidUrl(url)) {
    throw new Error("Invalid or blocked URL. Private and local addresses are not allowed.");
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method: "GET",
      headers: filterRequestHeaders(new Headers(headers)),
      redirect: "follow",
      signal: controller.signal,
    };

    return await fetch(url, fetchOptions);
  } finally {
    clearTimeout(id);
  }
}
