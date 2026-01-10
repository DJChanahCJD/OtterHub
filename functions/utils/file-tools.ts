import { FileType, chunkPrefix } from "./types";

// 获取文件扩展名
export function getFileExt(fileName: string): string {
  return fileName.split(".").pop()!.toLowerCase();
}

// 构建存储键
export function buildKeyId(fileType: FileType, fileId: string, ext: string): string {
  return `${fileType}:${fileId}.${ext}`;
}

// 从存储键提取文件ID
export function getFileIdFromKey(key: string): { fileId: string, isChunk: boolean } {
  // img:AgACAgUAAyEGAASJIjr1AAIC5WlbsF4QGE2g_21Ln6AFzqUDj27uAAIZC2sbI3PhVp15EFHwmGQcAQADAgADbQADOAQ.png
  const [prefix, rest] = key.split(":");
  const fileId = rest.split(".")[0];

  // AgACAgUAA...DeQADOAQ

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
  const e = ext.toLowerCase();

  // ---------- 图片 ----------
  if (['png'].includes(e)) return 'image/png';
  if (['jpg', 'jpeg'].includes(e)) return 'image/jpeg';
  if (['webp'].includes(e)) return 'image/webp';
  if (['gif'].includes(e)) return 'image/gif';
  if (['bmp'].includes(e)) return 'image/bmp';
  if (['svg'].includes(e)) return 'image/svg+xml';

  // ---------- 视频 ----------
  if (['mp4'].includes(e)) return 'video/mp4';
  if (['webm'].includes(e)) return 'video/webm';
  if (['ogg', 'ogv'].includes(e)) return 'video/ogg';

  // ---------- 音频 ----------
  if (['mp3'].includes(e)) return 'audio/mpeg';
  if (['wav'].includes(e)) return 'audio/wav';
  if (['ogg'].includes(e)) return 'audio/ogg';
  if (['m4a'].includes(e)) return 'audio/mp4';
  if (['aac'].includes(e)) return 'audio/aac';
  if (['flac'].includes(e)) return 'audio/flac';

  // ---------- 文档 ----------
  if (['pdf'].includes(e)) return 'application/pdf';
  if (['txt'].includes(e)) return 'text/plain; charset=utf-8';
  if (['md'].includes(e)) return 'text/markdown; charset=utf-8';
  if (['html', 'htm'].includes(e)) return 'text/html; charset=utf-8';

  // ---------- 兜底 ----------
  return 'application/octet-stream';
}