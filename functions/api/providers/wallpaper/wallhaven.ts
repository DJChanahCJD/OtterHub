import { ok, fail } from "../../../utils/common";
import { getWallpaperProxyUrl } from "../../../utils/proxy";
import { UnifiedWallpaper } from "./types";

const baseUrl = "https://wallhaven.cc/api/v1/search";

// !在本地环境无法请求成功, 尝试生产环境
export async function onRequest(context: any) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);

    // 优先从查询参数获取 API Key，否则从环境变量获取
    const apiKey = url.searchParams.get("apiKey") || env.WALLHAVEN_API_KEY;

    const params = new URLSearchParams({
      q: url.searchParams.get("q") || "",
      categories: url.searchParams.get("categories") || "111",
      purity: url.searchParams.get("purity") || "100",
      sorting: url.searchParams.get("sorting") || "random",
      page: url.searchParams.get("page") || "1",
    });

    // 处理 Toplist 范围
    const topRange = url.searchParams.get("topRange");
    if (topRange && params.get("sorting") === "toplist") {
      params.set("topRange", topRange);
    }

    if (apiKey) {
      params.set("apikey", apiKey);
    }

    // 处理随机种子
    const sorting = params.get("sorting");
    if (sorting === "random") {
      params.set("seed", Date.now().toString().slice(-6));
    }

    const apiUrl = `${baseUrl}?${params}`;

    console.log("wallheaven: ", apiUrl, JSON.stringify(params));

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OtterHub/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Wallhaven API error: ${response.status}`);
    }

    const data: any = await response.json();

    const unifiedData: UnifiedWallpaper[] = data.data.map((item: any) => {
      const previewUrl = item.thumbs.original || item.thumbs.large || item.thumbs.small;
      const rawUrl = item.path;

      return {
        id: item.id,
        // 对预览图和原图使用代理，解决国内环境访问慢或无法访问的问题
        previewUrl: getWallpaperProxyUrl(url.origin, previewUrl),
        rawUrl: getWallpaperProxyUrl(url.origin, rawUrl),
        source: "wallhaven",
      };
    });

    return ok(unifiedData, `获取成功`);
  } catch (error: any) {
    console.error("Wallhaven provider error:", error);
    return fail(error.message, 500);
  }
}
