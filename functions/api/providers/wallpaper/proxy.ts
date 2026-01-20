// functions/api/providers/wallpaper/proxy.ts
import { fail } from "../../../utils/common";
import { proxyGet } from "../../../utils/proxy";

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

    // 发起代理请求，使用重构后的统一代理
    const response = await proxyGet(targetUrl);

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
