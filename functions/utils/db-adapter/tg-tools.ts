import { getFileExt } from "../file";
import { FileType } from "@shared/types";

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
  // 仅处理 GIF 类型文件（兼容后缀大写/小写）
  const isGif = file.type === "image/gif" || /\.gif$/i.test(fileName);
  if (!isGif) {
    return { file, fileName };
  }

  try {
    // 核心：直接读取原文件的 Blob 数据，不做任何内容转换
    const blob = await file.arrayBuffer().then(buffer => new Blob([buffer]));
    
    // 替换文件名为 webp 后缀（不区分大小写）
    const newFileName = fileName.replace(/\.gif$/i, ".webp");
    
    // 创建新的 File 对象，仅修改名称和 MIME 类型，内容不变
    const newFile = new File([blob], newFileName, { type: "image/webp" });

    return { file: newFile, fileName: newFileName };
  } catch (error) {
    // 异常处理：失败时返回原文件
    console.error("GIF 文件重命名失败：", error);
    return { file, fileName };
  }
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
  // 表情包/动图
  if (result.sticker) return result.sticker.file_id;
  if (result.animation) return result.animation.file_id;

  return null;
}

export function getVideoThumbId(response: any): string | null {
  if (!response.ok || !response.result) return null;

  const result = response.result;
  if (!result.video) return null;
  
  // 拿到file_id 还需要通过getFilePath获取到具体文件路径，然后存到video的元数据中
  return result.video.thumb.file_id;
}