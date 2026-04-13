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


/**
 * 将 HTMLImageElement 等比缩放绘制到指定尺寸的正方形 canvas
 * @param img 图片元素
 * @param size 目标边长（px），默认 224
 */
export function resizeImageToCanvas(
  img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  size = 224
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
  return canvas;
}

/**
 * 从图片 URL 加载图片，缩放并压缩为 Blob
 * @param url 图片地址
 * @param size 目标边长（px），默认 224
 * @param quality JPEG 压缩质量 0~1，默认 0.7
 */
export function compressImageFromUrl(
  url: string,
  size = 224,
  quality = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = resizeImageToCanvas(img, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

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

