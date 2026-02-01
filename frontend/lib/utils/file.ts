import { FileMetadata, FileType } from "@shared/types";
import { DIRECT_DOWNLOAD_LIMIT } from "../types";

export const getFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) return FileType.Image;
  if (mimeType.startsWith("audio/")) return FileType.Audio;
  if (mimeType.startsWith("video/")) return FileType.Video;
  return FileType.Document;
};

export const getFileTypeFromKey = (key: string): FileType => {
  const fileType = key.split(":")[0];
  return fileType as FileType;
};

/**
 * 格式化文件大小
 * @param bytes 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


// 下载文件
export const downloadFile = async (url: string, metadata: FileMetadata) => {
  if (!url) return;

  const { fileSize, fileName } = metadata;

  // 大文件让用户自己直接通过浏览器控件下载
  if (fileSize > DIRECT_DOWNLOAD_LIMIT) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  
  // 小文件直接通过url下载
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener,noreferrer";
  
  document.body.appendChild(a);
  a.click();

  setTimeout(() => a.remove(), 100);
};

