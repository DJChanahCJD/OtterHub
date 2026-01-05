// lib/api.ts
import { request } from "./utils";
import { ListFilesRequest, ListFilesResponse } from "./types";

// 开发环境：.env.local
// 生产环境：当前域名
// 注意：使用typeof window !== 'undefined'检查，避免服务端渲染错误
export const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  return request<string>(`${API_URL}/api/upload1`, {
    method: 'POST',
    body: formData,
  })
}

export function getFileList(params?: ListFilesRequest): Promise<ListFilesResponse> {
  const query = new URLSearchParams(params).toString()
  return request<ListFilesResponse>(`${API_URL}/api/list?${query}`)
}

export function getFileUrl(key: string): string {
  return `${API_URL}/file/${key}`
}

export function deleteFile(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/delete/${key}`, {
    method: 'POST',
  })
}

export function editFileName(key: string, fileName: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/editName/${key}?fileName=${fileName}`, {
    method: 'PATCH',
  })
}

export function toggleLike(key: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/toggleLike/${key}`, {
    method: 'POST',
  })
}

export function logout(): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/logout`, {
    method: 'POST',
  })
}
