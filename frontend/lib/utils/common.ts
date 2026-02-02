import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiResponse } from "@shared/types";
import { getFileType } from "./file";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化音视频时间为分秒格式
export const formatMediaTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

export function buildTmpFileKey(file: File): string {
  const fileType = getFileType(file.type);
  return `${fileType}:${crypto.randomUUID()}`;
}

export function openExternalLink(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}