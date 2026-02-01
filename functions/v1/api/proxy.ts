import { failV1 } from "@utils/common";
import { proxyGet, handleStreamResponse } from "@utils/proxy";

/**
 * 代理接口 - 只处理 GET 请求
 * 用于代理获取外部资源，绕过 CORS 限制
 */
export async function onRequestGet(context: any) {
  const { request } = context;

  try {
    let targetUrl: string | null = null;
    let customHeaders: Record<string, string> | undefined;

    const url = new URL(request.url);
    targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return failV1("URL parameter is required", 400);
    }

    // 从查询参数中获取自定义 headers（可选）
    const headersParam = url.searchParams.get("headers");
    if (headersParam) {
      try {
        customHeaders = JSON.parse(headersParam);
      } catch {
        // 忽略无效的 headers
      }
    }

    const response = await proxyGet(targetUrl, customHeaders);
    
    // 对于通用代理，我们透传流式响应并过滤敏感头
    return handleStreamResponse(response);
  } catch (e: any) {
    console.error("Proxy error:", e);
    return failV1(`Proxy error: ${e.message || "Unknown error"}`, 500);
  }
}