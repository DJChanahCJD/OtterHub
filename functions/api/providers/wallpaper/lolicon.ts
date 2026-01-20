import { ok, fail } from "../../../utils/common";
import { getWallpaperProxyUrl } from "../../../utils/proxy";
import { UnifiedWallpaper, LoliconConfig } from "./types";

const API_URL = "https://api.lolicon.app/setu/v2";

// https://docs.api.lolicon.app/#/setu
export async function onRequestGet(context: any) {
  const { request } = context;

  try {
    const url = new URL(request.url);
    const origin = url.origin;

    // 获取参数
    const r18 = url.searchParams.get("r18") || "0";
    const num = url.searchParams.get("num") || "20";
    const tag = url.searchParams.getAll("tag");
    const keyword = url.searchParams.get("q") || url.searchParams.get("keyword");
    const excludeAI = url.searchParams.get("excludeAI") === "true";

    // 构造请求 Lolicon 的 URL
    const loliconUrl = new URL(API_URL);
    loliconUrl.searchParams.set("r18", r18);
    loliconUrl.searchParams.set("num", num);
    // 使用假值以获取原始域名 i.pximg.net，由我们自己的代理处理防盗链
    loliconUrl.searchParams.set("proxy", "0"); 
    
    if (tag && tag.length > 0) {
      tag.forEach(t => loliconUrl.searchParams.append("tag", t));
    }
    if (keyword) {
      loliconUrl.searchParams.set("keyword", keyword);
    }
    if (excludeAI) {
      loliconUrl.searchParams.set("excludeAI", "true");
    }

    // 默认请求 regular 和 small 规格
    loliconUrl.searchParams.append("size", "regular");
    loliconUrl.searchParams.append("size", "small");

    console.log("Lolicon API request:", loliconUrl.toString());
    const response = await fetch(loliconUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Referer": "https://www.pixiv.net/",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lolicon API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    // console.log("Lolicon API response:", data);

    if (data.error) {
      throw new Error(data.error);
    }

    // 统一数据格式
    const unifiedData: UnifiedWallpaper[] = data.data.map((item: any) => {
      // 预览图
      const previewUrl = item.urls.small || item.urls.thumb || item.urls.regular || item.urls.original;
      const rawUrl = item.urls.regular;

      return {
        id: item.pid,
        // 使用项目内置代理包装，确保国内环境可用
        previewUrl: getWallpaperProxyUrl(origin, previewUrl),
        rawUrl: rawUrl,
        source: "lolicon",
      };
    });

    return ok(unifiedData, `获取成功`);
  } catch (error: any) {
    console.error("Lolicon provider error:", error);
    return fail(error.message, 500);
  }
}
