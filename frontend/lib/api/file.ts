import { request } from "@/lib/utils";
import { API_URL } from ".";
import { FileType, ListFilesResponse } from "@shared/types";
import { ListFilesRequest } from "@/lib/types";

/**
 * 上传文件
 */
export function uploadFile(file: File, nsfw?: boolean): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (nsfw) {
    formData.append("nsfw", "true");
  }

  return request<string>(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });
}

/**
 * 初始化分片上传
 */
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
  return request<string>(`${API_URL}/upload/chunk/init?${query}`, {
    method: "GET",
  });
}

/**
 * 上传分片
 */
export function uploadChunk(
  key: string,
  chunkIndex: number,
  chunkFile: File | Blob,
): Promise<string> {
  const formData = new FormData();
  formData.append("key", key);
  formData.append("chunkIndex", chunkIndex.toString());
  formData.append("chunkFile", chunkFile);

  return request<string>(`${API_URL}/upload/chunk`, {
    method: "POST",
    body: formData,
  });
}

/**
 * 获取文件列表
 */
export function getFileList(
  params?: ListFilesRequest
): Promise<ListFilesResponse> {
  const query = new URLSearchParams(params).toString();
  return request<ListFilesResponse>(`${API_URL}/file/list?${query}`);
}

/**
 * 获取文件预览/下载 URL
 */
export function getFileUrl(key: string): string {
  return `${API_URL}/file/${key}`;
}

/**
 * 获取回收站文件 URL
 */
export function getTrashFileUrl(key: string): string {
  return `${API_URL}/trash/${key}`;
}

/**
 * 彻底删除文件
 */
export function deleteFile(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/file/${key}`, {
    method: "DELETE",
  });
}

/**
 * 移动文件到回收站
 */
export function moveToTrash(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/trash/${key}/move`, {
    method: "POST",
  });
}

/**
 * 从回收站恢复文件
 */
export function restoreFile(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/trash/${key}/restore`, {
    method: "POST",
  });
}

/**
 * 切换收藏状态
 */
export function toggleLike(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/file/${key}/toggle-like`, {
    method: "POST",
  });
}

/**
 * 编辑文件元数据
 */
export function editMetadata(
  key: string,
  updates: { fileName?: string; tags?: string[] }
): Promise<{ metadata: any }> {
  return request<{ metadata: any }>(`${API_URL}/file/${key}/meta`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
}
