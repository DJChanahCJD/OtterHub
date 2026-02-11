import { client } from "./client";
import { API_URL, unwrap } from "./config";
import { ApiResponse, FileType, ListFilesResponse } from "@shared/types";
import { ListFilesRequest } from "@/lib/types";

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type ChunkProcessingProgress = {
  uploadedIndices: number[];
  uploaded: number;
  total: number;
  complete: boolean;
};

function redirectToLoginIfNeeded() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  const currentUrl = window.location.href;
  const redirectUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;
  window.location.href = redirectUrl;
}

async function parseApiResponse<T>(raw: string): Promise<T> {
  let body: ApiResponse<T>;
  try {
    body = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    throw new Error(raw || "请求失败");
  }

  if (!body.success) {
    throw new Error(body.message || "请求失败");
  }

  return body.data as T;
}

function xhrPostForm<T>(
  url: string,
  form: FormData,
  onProgress?: (p: UploadProgress) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      const total = e.total || 0;
      const loaded = e.loaded || 0;
      const percent =
        total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      onProgress({ loaded, total, percent });
    };

    xhr.onload = async () => {
      if (xhr.status === 401) {
        redirectToLoginIfNeeded();
        reject(new Error("Unauthorized"));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
        return;
      }

      try {
        const data = await parseApiResponse<T>(xhr.responseText);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.onabort = () => reject(new Error("请求已取消"));

    xhr.send(form);
  });
}

/**
 * 上传文件
 */
export async function uploadFile(file: File, nsfw?: boolean): Promise<string> {
  return unwrap<string>(
    client.upload.$post({
      form: {
        file: file,
        nsfw: nsfw ? "true" : "false",
      },
    })
  );
}

export async function uploadFileWithProgress(
  file: File,
  nsfw: boolean | undefined,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("nsfw", nsfw ? "true" : "false");

  const url = `${API_URL}/upload`;
  return xhrPostForm<string>(url, form, onProgress);
}

/**
 * 初始化分片上传
 */
export async function uploadChunkInit(
  fileType: FileType,
  fileName: string,
  fileSize: number,
  totalChunks: number
): Promise<string> {
  return unwrap<string>(
    client.upload.chunk.init.$get({
      query: {
        fileType,
        fileName,
        fileSize: fileSize.toString(),
        totalChunks: totalChunks.toString(),
      },
    })
  );
}

/**
 * 上传分片
 */
export async function uploadChunk(
  key: string,
  chunkIndex: number,
  chunkFile: File | Blob,
): Promise<string> {
  const res = await unwrap<string | number>( // API might return number or string for data? Check type.
    client.upload.chunk.$post({
      form: {
        key,
        chunkIndex: chunkIndex.toString(),
        chunkFile: chunkFile,
      },
    })
  );
  return res.toString();
}

export async function uploadChunkWithProgress(
  key: string,
  chunkIndex: number,
  chunkFile: File | Blob,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  const form = new FormData();
  form.append("key", key);
  form.append("chunkIndex", chunkIndex.toString());
  form.append("chunkFile", chunkFile);

  const url = `${API_URL}/upload/chunk`;
  const res = await xhrPostForm<string | number>(url, form, onProgress);
  return res.toString();
}

export async function getUploadChunkProgress(
  key: string,
): Promise<ChunkProcessingProgress> {
  return unwrap<ChunkProcessingProgress>(
    client.upload.chunk.progress.$get({
      query: { key },
    })
  );
}

/**
 * 获取文件列表
 */
export async function getFileList(
  params?: ListFilesRequest
): Promise<ListFilesResponse> {
  const query: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query[k] = String(v);
    });
  }

  return unwrap<ListFilesResponse>(
    client.file.list.$get({
      query: query,
    })
  );
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
export async function deleteFile(key: string): Promise<boolean> {
  const res = await client.file[":key"].$delete({
    param: { key },
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}

/**
 * 移动文件到回收站
 */
export async function moveToTrash(key: string): Promise<boolean> {
  const res = await client.trash[":key"].move.$post({
    param: { key },
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}

/**
 * 从回收站恢复文件
 */
export async function restoreFile(key: string): Promise<boolean> {
  const res = await client.trash[":key"].restore.$post({
    param: { key },
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}

/**
 * 切换收藏状态
 */
export async function toggleLike(key: string): Promise<boolean> {
  const res = await client.file[":key"]["toggle-like"].$post({
    param: { key },
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}

/**
 * 编辑文件元数据
 */
export async function editMetadata(
  key: string,
  updates: { fileName?: string; tags?: string[] }
): Promise<{ metadata: any }> {
  const data = await unwrap<any>(
    client.file[":key"].meta.$patch({
      param: { key },
      json: updates,
    })
  );
  return { metadata: data };
}
