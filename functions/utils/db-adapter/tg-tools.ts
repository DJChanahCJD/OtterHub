// functions/utils/db-adapter/tg-tools.ts
import { getFileExt } from "../file";
import { FileType } from "../types";

/**
 * 解析 Range 请求头
 * @returns { start, end } 或 null（如果无效）
 */
export function parseRangeHeader(
  range: string | null,
  fileSize: number
): { start: number; end: number } | null {
  if (!range) return null;

  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!match) return null;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : fileSize - 1;

  if (start >= fileSize || end < start) {
    return null;
  }

  return { start, end };
}

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

export function resolveFileDescriptor(
  file: File,
  fileName: string
): {
  api: string;
  field: string;
  fileType: FileType;
  ext: string;
} {
  const ext = getFileExt(fileName).toLowerCase();
  const mime = file.type;

  // GIF 特判（Telegram 行为问题）
  if (mime === "image/gif" || ext === "gif") {
    return {
      api: "sendAnimation",
      field: "animation",
      fileType: FileType.Image,
      ext,
    };
  }

  if (mime.startsWith("image/")) {
    return {
      api: "sendPhoto",
      field: "photo",
      fileType: FileType.Image,
      ext,
    };
  }

  if (mime.startsWith("video/")) {
    return {
      api: "sendVideo",
      field: "video",
      fileType: FileType.Video,
      ext,
    };
  }

  if (mime.startsWith("audio/")) {
    return {
      api: "sendAudio",
      field: "audio",
      fileType: FileType.Audio,
      ext,
    };
  }

  return {
    api: "sendDocument",
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