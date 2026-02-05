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

/**
 * 简单重试工具
 * @param fn 要执行的异步函数
 * @param retry 重试次数
 * @param delay 每次重试间隔(ms)
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retry = 2,
  delay = 500
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= retry; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i === retry) break;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * 渐进式批量处理工具
 * 用于避免大量同步操作阻塞主线程，同时提供进度反馈
 *
 * @param items 要处理的数组
 * @param fn 处理单个项目的函数（支持异步）
 * @param onProgress 进度回调 (current, total) => void
 * @param batchSize 每批处理数量，默认 50 (Store操作较快，可以大一点)
 * @param interval 批次间隔(ms)，默认 0 (利用事件循环释放主线程)
 */
export async function processBatch<T>(
  items: T[],
  fn: (item: T) => Promise<void> | void,
  onProgress?: (current: number, total: number) => void,
  batchSize = 50,
  interval = 0
): Promise<void> {
  const total = items.length;
  if (total === 0) return;

  for (let i = 0; i < total; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    
    // 处理当前批次
    await Promise.all(chunk.map(item => fn(item)));
    
    // 更新进度
    const current = Math.min(i + batchSize, total);
    onProgress?.(current, total);
    
    // 释放主线程
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}