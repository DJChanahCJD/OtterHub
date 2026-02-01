import { ok, fail } from "../../../utils/common";
import { UnifiedWallpaper } from "@shared/types";

const API_BASE = "https://api.unsplash.com";

export async function onRequestGet(context: any) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const accessKey = url.searchParams.get("apiKey") || env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      return fail("Unsplash Access Key is required", 400);
    }

    const query = url.searchParams.get("q") || url.searchParams.get("query");
    const page = url.searchParams.get("page") || "1";
    const per_page = url.searchParams.get("per_page") || "20";
    const orientation = url.searchParams.get("orientation");
    const content_filter = url.searchParams.get("content_filter") || "low";

    let apiUrl: string;
    const searchParams = new URLSearchParams({
      per_page,
      page,
    });

    if (query) {
      apiUrl = `${API_BASE}/search/photos`;
      searchParams.set("query", query);
      if (orientation) searchParams.set("orientation", orientation);
      searchParams.set("content_filter", content_filter);
    } else {
      apiUrl = `${API_BASE}/photos`;
    }

    const response = await fetch(`${apiUrl}?${searchParams.toString()}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.errors?.join(", ") ||
        `Unsplash API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const result: any = await response.json();
    const photos = query ? result.results : result;

    const unifiedData: UnifiedWallpaper[] = photos.map((photo: any) => ({
      id: photo.id, 
      // 使用 regular 版本作为预览图 (1080px)，平衡清晰度与加载速度
      previewUrl: photo.urls.regular,
      // 使用 raw 链接并添加优化参数作为下载/大图链接
      // q=85 (质量), auto=format (自动选择格式), fm=webp (优先 webp)
      rawUrl: `${photo.urls.regular}&q=85&fm=webp`,
      source: "unsplash",
    }));

    return ok(unifiedData, "获取成功");
  } catch (error: any) {
    console.error("Unsplash provider error:", error);
    return fail(error.message, 500);
  }
}
