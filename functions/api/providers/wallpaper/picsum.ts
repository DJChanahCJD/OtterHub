import { ok, fail } from "../../../utils/common";
import { UnifiedWallpaper } from "./types";

const baseUrl = "https://picsum.photos/v2/list";

export async function onRequestGet(context: any) {
  const { request } = context;

  try {
    const url = new URL(request.url);

    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "20";
    const grayscale = url.searchParams.get("grayscale") === "true";

    const params = new URLSearchParams({
      page,
      limit,
    });

    const apiUrl = `${baseUrl}?${params}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Picsum API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();

    const unifiedData: UnifiedWallpaper[] = data.map((item: any) => {
      // 构造预览图和原图 URL
      // 预览图使用 800x600 以平衡清晰度和速度
      let previewUrl = `https://picsum.photos/id/${item.id}/800/600`;
      let rawUrl = item.download_url;

      const queryParams = [];
      if (grayscale) queryParams.push("grayscale");

      if (queryParams.length > 0) {
        const queryString = `?${queryParams.join("&")}`;
        previewUrl += queryString;
        rawUrl += queryString;
      }

      return {
        id: item.id,
        previewUrl,
        rawUrl,
        source: "picsum",
      };
    });

    return ok(unifiedData, `获取成功`);
  } catch (error: any) {
    console.error("Picsum provider error:", error);
    return fail(error.message, 500);
  }
}
