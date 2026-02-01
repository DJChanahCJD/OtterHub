import { ok, fail } from "@utils/common";
import { UnifiedWallpaper } from "@shared/types";

const baseUrl = "https://pixabay.com/api/";

export async function onRequestGet(context: any) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);

    // 优先从查询参数获取 API Key，否则从环境变量获取
    const apiKey = url.searchParams.get("apiKey") || env.PIXABAY_API_KEY;
    if (!apiKey) {
      return fail("Pixabay API Key is required", 400);
    }

    // 随机页码逻辑：如果未指定 page，则随机 1-20 页
    let page = url.searchParams.get("page");
    if (!page) {
      page = Math.floor(Math.random() * 20 + 1).toString();
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: url.searchParams.get("q") || "",
      category: url.searchParams.get("category") || "",
      order: url.searchParams.get("order") || "popular",
      page: page,
      per_page: "20", // 固定返回 20 条
    });

    const apiUrl = `${baseUrl}?${params}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pixabay API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();

    // 统一数据格式
    const unifiedData: UnifiedWallpaper[] = data.hits.map((item: any) => {
      const previewUrl = item.webformatURL;
      const rawUrl = item.largeImageURL || item.imageURL;
      // 国内可访问 pixabay, 无需代理
      return {
        id: item.id,
        previewUrl: previewUrl,
        rawUrl: rawUrl,
        source: "pixabay",
      };
    });

    return ok(unifiedData, `获取成功`);
  } catch (error: any) {
    console.error("Pixabay provider error:", error);
    return fail(error.message, 500);
  }
}
