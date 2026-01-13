import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiResponse, DIRECT_DOWNLOAD_LIMIT, FileMetadata, FileType, MAX_CHUNK_SIZE } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function request<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);

  // HTTP 层错误
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();

  // 业务层错误
  if (!result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result.data;
}

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

// 格式化时间戳为 "YYYY.MM.DD HH:mm" 格式
export const formatTime = (timestamp: number) => {
  // 校验时间戳有效性
  if (isNaN(timestamp) || timestamp < 0) return "N/A";

  const date = new Date(timestamp);
  // 获取年份
  const year = date.getFullYear();
  // 获取月份（补0，确保两位数）
  const month = String(date.getMonth() + 1).padStart(2, "0");
  // 获取日期（补0）
  const day = String(date.getDate()).padStart(2, "0");
  // 获取小时（补0）
  const hour = String(date.getHours()).padStart(2, "0");
  // 获取分钟（补0）
  const minute = String(date.getMinutes()).padStart(2, "0");

  // 拼接成指定格式
  return `${year}.${month}.${day} ${hour}:${minute}`;
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

// 格式化音视频时间为分秒格式
export const formatMediaTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function buildTmpFileKey(file: File): string {
  const fileType = getFileType(file.type);
  return `${fileType}:${crypto.randomUUID()}`;
}

export function openExternalLink(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}