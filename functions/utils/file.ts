import { extractKeyFromTrash } from "./db-adapter/shared-utils";
import { FileType, chunkPrefix } from "@shared/types";
import {
  getExtension,
  getFileTypeByMimeOrExt as getSharedFileTypeByMimeOrExt,
  getMimeTypeByExt,
} from "@shared/utils/file";

// 获取文件扩展名
export function getFileExt(fileName: string): string {
  return getExtension(fileName);
}

// 构建存储键
export function buildKeyId(fileType: FileType, fileId: string, ext: string): string {
  return `${fileType}:${fileId}.${ext}`;
}

// 从存储键提取文件ID
export function getFileIdFromKey(key: string): { fileId: string, isChunk: boolean } {
  // 处理回收站前缀
  const cleanKey = extractKeyFromTrash(key)

  // img:AgACAgUAAyEGAASJIjr1AAIC5WlbsF4QGE2g_21Ln6AFzqUDj27uAAIZC2sbI3PhVp15EFHwmGQcAQADAgADbQADOAQ.png
  const [prefix, rest] = cleanKey.split(":");
  const fileId = rest.split(".")[0];  // AgACAgUAA...DeQADOAQ
  
  // 处理分片文件ID
  if (fileId.startsWith(chunkPrefix)) {
    return { fileId: fileId.slice(chunkPrefix.length), isChunk: true };
  }
  return { fileId, isChunk: false };
}

// 生成唯一文件ID
// 当前用于R2和TG分片上传的fileId，TG的文件ID由TG API返回
export function getUniqueFileId(length = 16): string {
  // 生成16位短 ID（0-9a-zA-Z）
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, "")
    .slice(0, length);
}

/**
 * 根据文件扩展名推断 Content-Type
 * 覆盖主流浏览器可 inline 预览的文件类型
 */
export function getContentTypeByExt(ext: string): string {
  return getMimeTypeByExt(ext);
}

export function getFileTypeByName(fileName: string): string {
  const ext = getFileExt(fileName);
  return getContentTypeByExt(ext);
}

export function getFileTypeByMimeOrExt(
  mimeType: string | undefined,
  ext: string,
): FileType {
  return getSharedFileTypeByMimeOrExt(mimeType, ext);
}
