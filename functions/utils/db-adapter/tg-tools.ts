import { getFileExt } from "../file";
import { FileType } from "../types";

/**
 * 构建 Telegram API URL
 */
export function buildTgApiUrl(botToken: string, endpoint: string): string {
  return `https://api.telegram.org/bot${botToken}/${endpoint}`;
}

/**
 * 构建 Telegram 文件 URL
 */
export function buildTgFileUrl(botToken: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

/**
 * 获取 Telegram 文件路径
 * @param fileId Telegram file_id
 * @param botToken Telegram Bot Token
 * @returns file_path 或 null
 */
export async function getTgFilePath(
  fileId: string,
  botToken: string
): Promise<string | null> {
  const url = buildTgApiUrl(botToken, "getFile");
  const res = await fetch(`${url}?file_id=${fileId}`);

  if (!res.ok) return null;

  const data = await res.json();
  return data?.ok ? data.result.file_path : null;
}

/**
 * 获取 Telegram 文件
 * @param fileId Telegram file_id
 * @param botToken Telegram Bot Token
 * @returns Response 对象
 */
export async function getTgFile(fileId: string, botToken: string): Promise<Response> {
  const filePath = await getTgFilePath(fileId, botToken);

  if (!filePath) {
    return new Response(`File not found: ${fileId}`, { status: 404 });
  }

  const url = buildTgFileUrl(botToken, filePath);
  return fetch(url);
}

export async function processGifFile(
  file: File,
  fileName: string
): Promise<{ file: File; fileName: string }> {
  if (file.type !== "image/gif") return { file, fileName };

  // GIF 转 WebP
  // 将文件转为 webp, 避免TG存储成 mp4
  // 利用 OffscreenCanvas + WebP MIME 转换
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.9 });
  const newFileName = fileName.replace(/\.gif$/, ".webp");

  return { file: new File([blob], newFileName, { type: "image/webp" }), fileName: newFileName };
}

export function resolveFileDescriptor(
  file: File,
  fileName: string
): {
  apiEndpoint: string;
  field: string;
  fileType: FileType;
  ext: string;
} {
  const ext = getFileExt(fileName).toLowerCase();
  const mime = file.type;

  // GIF 特判
  if (mime === "image/gif" || ext === "gif" || mime === "image/webp" || ext === "webp") {
    return {
      apiEndpoint: "sendDocument",
      field: "document",
      fileType: FileType.Image,
      ext,
    };
  }

  if (mime.startsWith("image/")) {
    return {
      apiEndpoint: "sendPhoto",
      field: "photo",
      fileType: FileType.Image,
      ext,
    };
  }

  if (mime.startsWith("video/")) {
    return {
      apiEndpoint: "sendVideo",
      field: "video",
      fileType: FileType.Video,
      ext,
    };
  }

  if (mime.startsWith("audio/")) {
    return {
      apiEndpoint: "sendAudio",
      field: "audio",
      fileType: FileType.Audio,
      ext,
    };
  }

  return {
    apiEndpoint: "sendDocument",
    field: "document",
    fileType: FileType.Document,
    ext,
  };
}

export function getTgFileId(response: any): string | null {
  if (!response.ok || !response.result) return null;

  const result = response.result;
  if (result.photo) {
    return result.photo.reduce((prev: any, current: any) =>
      prev.file_size > current.file_size ? prev : current
    ).file_id;
  }
  if (result.document) return result.document.file_id;
  if (result.video) return result.video.file_id;
  if (result.audio) return result.audio.file_id;

  return null;
}
