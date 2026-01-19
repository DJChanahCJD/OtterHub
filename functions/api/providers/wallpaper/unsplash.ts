import { ok, fail } from "../../../utils/common";
import { UnifiedWallpaper } from "./types";

const API_BASE = "https://api.unsplash.com";

export async function onRequest(context: any) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const accessKey = url.searchParams.get("apikey") || env.UNSPLASH_ACCESS_KEY;

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
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unsplash API error: ${response.status} - ${errorText}`);
    }

    const result: any = await response.json();
    const photos = query ? result.results : result;

    const unifiedData: UnifiedWallpaper[] = photos.map((photo: any) => ({
      id: photo.id,
      previewUrl: photo.urls.regular,
      rawUrl: photo.urls.full,
      source: "unsplash",
    }));

    return ok(unifiedData, "获取成功");
  } catch (error: any) {
    console.error("Unsplash provider error:", error);
    return fail(error.message, 500);
  }
}
