import { client } from "./client";
import { WallpaperSourceId, UnifiedWallpaper } from "@shared/types";
import { unwrap } from "./config";

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

  return unwrap<UnifiedWallpaper[]>(
    client.wallpaper[":source"].$get({
      param: { source },
      query: query,
    })
  );
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
  return unwrap<any>(
    client.upload["by-url"].$post({
      json: {
        url,
        fileName,
        isNsfw,
      },
    })
  );
}
