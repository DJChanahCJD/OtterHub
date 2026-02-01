import { request } from "@/lib/utils";
import { API_URL } from ".";
import { WallpaperSourceId, UnifiedWallpaper } from "@shared/types";

/**
 * 获取壁纸列表
 * @param source 壁纸源
 * @param params 查询参数
 * @returns 统一的壁纸列表
 */
export function getWallpapers(
  source: WallpaperSourceId, 
  params: Record<string, any>
): Promise<UnifiedWallpaper[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) searchParams.append(k, String(v));
  });

  return request<UnifiedWallpaper[]>(`${API_URL}/api/providers/wallpaper/${source}?${searchParams.toString()}`);
}

/**
 * 通过 URL 上传文件
 * @param url 文件 URL
 * @param fileName 文件名
 * @param isNsfw 是否为 NSFW
 * @returns 上传结果
 */
export function uploadByUrl(
  url: string, 
  fileName: string, 
  isNsfw: boolean = false
): Promise<any> {
  return request<any>(`${API_URL}/api/upload/by-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      fileName,
      isNsfw,
    }),
  });
}
