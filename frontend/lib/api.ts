// lib/api.ts
import { request } from "./utils";
import {
  FileType,
  ListFilesRequest,
  ListFilesResponse,
  UnifiedWallpaper,
  PixabaySearchParams,
  WallhavenSearchParams,
} from "./types";

// 开发环境：.env.local
// 生产环境：当前域名
// 注意：使用typeof window !== 'undefined'检查，避免服务端渲染错误
export const API_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || ""
    : "";

  // 登录
export function login(password: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

// 登出
export function logout(): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/logout`, {
    method: "POST",
  });
}

export function uploadFile(file: File, nsfw?: boolean): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (nsfw) {
    formData.append("nsfw", "true");
  }

  return request<string>(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });
}

export function uploadChunkInit(
  fileType: FileType,
  fileName: string,
  fileSize: number,
  totalChunks: number
): Promise<string> {
  const query = new URLSearchParams({
    fileType: fileType,
    fileName: fileName,
    fileSize: fileSize.toString(),
    totalChunks: totalChunks.toString(),
  }).toString();
  return request<string>(`${API_URL}/api/upload/chunk?${query}`, {
    method: "GET",
  });
}
export function uploadChunk(
  key: string,
  chunkIndex: number,
  chunkFile: File | Blob,
): Promise<string> {
  const formData = new FormData();
  formData.append("key", key);
  formData.append("chunkIndex", chunkIndex.toString());
  formData.append("chunkFile", chunkFile);

  return request<string>(`${API_URL}/api/upload/chunk`, {
    method: "POST",
    body: formData,
  });
}

export function getFileList(
  params?: ListFilesRequest
): Promise<ListFilesResponse> {
  const query = new URLSearchParams(params).toString();
  return request<ListFilesResponse>(`${API_URL}/api/list?${query}`);
}

export function getFileUrl(key: string): string {
  return `${API_URL}/file/${key}`;
}

export function getTrashFileUrl(key: string): string {
  // trash:img:xxx123.png
  return `${API_URL}/api/trash/${key}`;
}

export function deleteFile(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/delete/${key}`, {
    method: "POST",
  });
}

export function moveToTrash(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/trash/moveToTrash/${key}`, {
    method: "POST",
  });
}

export function restoreFile(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/trash/restore/${key}`, {  //  传 trash:<key>
    method: "POST",
  });
}

export function toggleLike(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/toggleLike/${key}`, {
    method: "POST",
  });
}

export function editMetadata(
  key: string,
  updates: { fileName?: string; tags?: string[] }
): Promise<{ metadata: any }> {
  return request<{ metadata: any }>(`${API_URL}/api/editFileMeta/${key}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
}

// === 壁纸相关 API ===

/**
 * 获取壁纸列表
 * @param source 壁纸源 (pixabay | wallhaven)
 * @param params 查询参数
 * @returns 统一的壁纸列表
 */
export function getWallpapers(
  source: string, 
  params: Record<string, any>
): Promise<UnifiedWallpaper[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) searchParams.append(k === 'key' || k === 'apiKey' ? 'apikey' : k, String(v));
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
