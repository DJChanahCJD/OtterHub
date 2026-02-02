import { client } from "./client";
import { WallpaperSourceId, UnifiedWallpaper } from "@shared/types";

/**
 * 获取壁纸列表
 * @param source 壁纸源
 * @param params 查询参数
 * @returns 统一的壁纸列表
 */
export async function getWallpapers(
  source: WallpaperSourceId,
  params: Record<string, any>
): Promise<UnifiedWallpaper[]> {
  const query: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v) query[k] = String(v);
  });

  const res = await client.wallpaper[":source"].$get({
    param: { source },
    query: query,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}

/**
 * 通过 URL 上传文件
 * @param url 文件 URL
 * @param fileName 文件名
 * @param isNsfw 是否为 NSFW
 * @returns 上传结果
 */
export async function uploadByUrl(
  url: string,
  fileName: string,
  isNsfw: boolean = false
): Promise<any> {
  const res = await client.upload["by-url"].$post({
    json: {
      url,
      fileName,
      isNsfw,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}
