import { FileType } from "../types";

export type FileCategory = "image" | "video" | "audio" | "text" | "other";

const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|heic|heif|tiff?)$/i;
const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)$/i;
const AUDIO_FILE_PATTERN = /\.(mp3|wav|ogg|flac|aac|m4a|wma|ape|opus)$/i;
const TEXT_FILE_PATTERN = /\.(txt|md|json|jsx?|tsx?|css|html|xml|ya?ml|csv|log|py|java|c|cpp|h|go|rs|sh|bat)$/i;

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
  "3gp": "video/3gpp",
  ogv: "video/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  opus: "audio/opus",
  wma: "audio/x-ms-wma",
  ape: "audio/ape",
  pdf: "application/pdf",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  htm: "text/html",
};

/** MIME type 到常用扩展名的映射 */
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",
  "video/x-m4v": ".m4v",
  "video/3gpp": ".3gp",
  "video/ogg": ".ogv",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/flac": ".flac",
  "audio/aac": ".aac",
  "audio/mp4": ".m4a",
  "audio/opus": ".opus",
  "audio/x-ms-wma": ".wma",
  "audio/ape": ".ape",
  "audio/x-ape": ".ape",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-rar-compressed": ".rar",
  "application/x-7z-compressed": ".7z",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/html": ".html",
};

export function getExtension(fileName: string): string {
  const base = fileName.split("/").pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : "";
}

export function getMimeTypeByExt(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] || "application/octet-stream";
}

export function getExtByMime(mimeType: string | null | undefined): string {
  return MIME_TO_EXT[extractMimeType(mimeType)] ?? "";
}

export function getFileCategoryByName(fileName: string): FileCategory {
  if (IMAGE_FILE_PATTERN.test(fileName)) return "image";
  if (VIDEO_FILE_PATTERN.test(fileName)) return "video";
  if (AUDIO_FILE_PATTERN.test(fileName)) return "audio";
  if (TEXT_FILE_PATTERN.test(fileName)) return "text";
  return "other";
}

export function getFileTypeByMimeOrExt(
  mimeType: string | null | undefined,
  ext: string,
): FileType {
  const normalizedMimeType = extractMimeType(mimeType);

  if (normalizedMimeType.startsWith("image/")) return FileType.Image;
  if (normalizedMimeType.startsWith("audio/")) return FileType.Audio;
  if (normalizedMimeType.startsWith("video/")) return FileType.Video;

  const contentType = getMimeTypeByExt(ext);
  if (contentType.startsWith("image/")) return FileType.Image;
  if (contentType.startsWith("audio/")) return FileType.Audio;
  if (contentType.startsWith("video/")) return FileType.Video;

  return FileType.Document;
}

export function getFileTypeByMimeOrName(
  mimeType: string | null | undefined,
  fileName: string,
): FileType {
  const normalizedMimeType = extractMimeType(mimeType);

  if (normalizedMimeType.startsWith("image/")) return FileType.Image;
  if (normalizedMimeType.startsWith("audio/")) return FileType.Audio;
  if (normalizedMimeType.startsWith("video/")) return FileType.Video;

  const category = getFileCategoryByName(fileName);
  if (category === "image") return FileType.Image;
  if (category === "audio") return FileType.Audio;
  if (category === "video") return FileType.Video;

  return FileType.Document;
}

/** 从 Content-Type 响应头中提取纯 MIME 类型（去除 charset 等参数） */
export function extractMimeType(contentType: string | null | undefined): string {
  if (!contentType) return "";
  return contentType.split(";")[0].trim().toLowerCase();
}

/** 从 Content-Disposition 响应头中解析文件名 */
export function extractFileNameFromDisposition(disposition: string | null): string {
  if (!disposition) return "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i);
  return match ? decodeURIComponent(match[1].trim()) : "";
}

/** 从 URL 路径中解析文件名（取最后一段，去除 query/hash） */
export function extractFileNameFromUrl(urlStr: string): string {
  try {
    const { pathname } = new URL(urlStr);
    const segment = pathname.split("/").pop() ?? "";
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

/** 判断文件名是否带有扩展名 */
export function hasExtension(name: string): boolean {
  const base = name.split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1;
}
