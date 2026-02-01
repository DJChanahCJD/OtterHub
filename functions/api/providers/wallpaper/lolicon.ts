// functions/api/providers/wallpaper/lolicon.ts
import { UnifiedWallpaper } from "@shared/types";
import { ok, fail } from "../../../utils/common";
import { getWallpaperProxyUrl } from "../../../utils/proxy";

const API_URL = "https://api.lolicon.app/setu/v2";

// 使用官方推荐的反代域名
const LOLICON_PROXY = "i.pixiv.re";

// https://docs.api.lolicon.app/#/setu
// TODO: 生产环境似乎被拦截了，只能转前端获取，暂时搁置
export async function onRequestGet(context: any) {
  const { request } = context;

  try {
    const url = new URL(request.url);
    // ===== 1. 读取请求参数 =====
    const r18 = url.searchParams.get("r18") ?? "0";
    const num = url.searchParams.get("num") ?? "20";
    const tags = url.searchParams.getAll("tag");
    const keyword =
      url.searchParams.get("q") ?? url.searchParams.get("keyword");
    const excludeAI = url.searchParams.get("excludeAI") === "true";

    // ===== 2. 构造 Lolicon API 请求 =====
    const loliconUrl = new URL(API_URL);
    loliconUrl.searchParams.set("r18", r18);
    loliconUrl.searchParams.set("num", num);

    // 关键点：交给 Lolicon 处理 Pixiv 防盗链
    loliconUrl.searchParams.set("proxy", LOLICON_PROXY);

    // 图片规格（客户端直接用）
    loliconUrl.searchParams.append("size", "regular");
    loliconUrl.searchParams.append("size", "small");

    if (tags.length > 0) {
      tags.forEach(tag => loliconUrl.searchParams.append("tag", tag));
    }

    if (keyword) {
      loliconUrl.searchParams.set("keyword", keyword);
    }

    if (excludeAI) {
      loliconUrl.searchParams.set("excludeAI", "true");
    }

    console.log("[Lolicon] request:", loliconUrl.toString());

    // ===== 3. 请求 Lolicon =====
    const response = await fetch(loliconUrl.toString(), {
      // 不要加 referer / headers
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lolicon API error ${response.status}: ${text}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // ===== 4. 统一数据结构（只做字段映射）=====
    const unifiedData: UnifiedWallpaper[] = result.data.map((item: any) => {
      const previewUrl = item.urls.small ?? item.urls.regular;

      const rawUrl =
        item.urls.regular ?? item.urls.original;

      return {
        id: item.pid,
        previewUrl: getWallpaperProxyUrl(url.origin, previewUrl),
        rawUrl,
        source: "lolicon",
      };
    });

    return ok(unifiedData, "获取成功");
  } catch (err: any) {
    console.error("[Lolicon] error:", err);
    return fail(err.message ?? "Internal Error", 500);
  }
}
