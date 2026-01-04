import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiResponse, FileType } from "./types";

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
  const fileType = key.split("_")[0];
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
export const downloadFile = (url: string, fileName: string) => {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// 格式化时间为分秒格式
export const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function buildTmpFileKey(file: File): string {
  const fileType = getFileType(file.type);
  return `${fileType}_${getUniqueFileId()}`;
}

function getUniqueFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}