import { fail } from "../../../utils/common";
import { proxyGetRequest } from "../../../utils/proxy";

/**
 * 壁纸专用代理接口
 * 专门处理壁纸图片的获取，包含防盗链绕过和缓存优化
 */
export async function onRequestGet(context: any) {
  const { request } = context;

  try {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return fail("URL parameter is required", 400);
    }

    const targetUrlObj = new URL(targetUrl);
    const customHeaders: Record<string, string> = {};

    // 针对不同站点的防盗链处理
    if (
      targetUrlObj.hostname.includes("pximg.net") || 
      targetUrlObj.hostname.includes("pixiv.re") || 
      targetUrlObj.hostname.includes("pixiv.net")
    ) {
      customHeaders["Referer"] = "https://www.pixiv.net/";
    }

    // 发起代理请求
    const response = await proxyGetRequest(targetUrl, customHeaders);

    // 针对图片的缓存优化：如果成功获取，设置较长的缓存时间
    if (response.ok) {
      const newHeaders = new Headers(response.headers);
      // 壁纸资源通常不会改变，缓存 1 小时
      newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  } catch (e: any) {
    console.error("Wallpaper proxy error:", e);
    return fail(`Wallpaper proxy error: ${e.message || "Unknown error"}`, 500);
  }
}
