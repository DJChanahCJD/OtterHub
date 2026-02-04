import { client } from "./client";
import { API_URL, unwrap } from "./config";
import { FileType, ListFilesResponse } from "@shared/types";
import { ListFilesRequest } from "@/lib/types";

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
