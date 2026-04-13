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

type TgPhotoVariant = {
  file_id?: string;
  file_size?: number;
};

type TgDocumentThumb = {
  file_id?: string;
};

type TgDocumentResult = {
  file_id?: string;
  file_size?: number;
  thumbnail?: TgDocumentThumb;
  thumb?: TgDocumentThumb;
};

type TgImageVariantIds = {
  fileId: string | null;
  previewFileId: string | null;
  fileSize?: number;
};

/**
 * 从 Telegram 图片尺寸列表中提取原图与预览图 file_id。
 */
function extractPhotoVariantIds(variants: TgPhotoVariant[]): TgImageVariantIds {
  const validVariants = variants.filter((item) => typeof item.file_id === "string");
  if (!validVariants.length) {
    return { fileId: null, previewFileId: null };
  }

  const sortedVariants = [...validVariants].sort((prev, current) =>
    (prev.file_size ?? 0) - (current.file_size ?? 0),
  );
  const originalVariant = sortedVariants[sortedVariants.length - 1];
  const previewVariant = [...sortedVariants]
    .reverse()
    .find((item) => item.file_id !== originalVariant.file_id) ?? null;

  return {
    fileId: originalVariant.file_id ?? null,
    previewFileId: previewVariant?.file_id ?? null,
    fileSize: originalVariant.file_size,
  };
}

/**
 * 统一提取 Telegram 图片上传结果中的主文件与预览图 file_id。
 */
export function getTgImageVariantIds(response: any): TgImageVariantIds {
  if (!response?.ok || !response?.result) {
    return { fileId: null, previewFileId: null };
  }

  if (Array.isArray(response.result.photo)) {
    return extractPhotoVariantIds(response.result.photo as TgPhotoVariant[]);
  }

  const documentResult = response.result.document as TgDocumentResult | undefined;
  if (!documentResult?.file_id) {
    return { fileId: null, previewFileId: null };
  }

  const previewFileId =
    documentResult.thumbnail?.file_id ?? documentResult.thumb?.file_id ?? null;

  return {
    fileId: documentResult.file_id,
    previewFileId:
      previewFileId && previewFileId !== documentResult.file_id ? previewFileId : null,
    fileSize: documentResult.file_size,
  };
}

/**
 * 从 Telegram sendPhoto 上传结果中提取原图与预览图的 file_id。
 */
export function getTgPhotoVariantIds(response: any): TgImageVariantIds {
  if (!response?.ok || !Array.isArray(response?.result?.photo)) {
    return { fileId: null, previewFileId: null };
  }

  return extractPhotoVariantIds(response.result.photo as TgPhotoVariant[]);
}

/**
 * 提取 Telegram 上传结果中的主文件 file_id。
 */
export function getTgFileId(response: any): string | null {
  if (!response.ok || !response.result) return null;

  const result = response.result;

  if (result.photo || result.document) {
    return getTgImageVariantIds(response).fileId;
  }
  if (result.video) return result.video.file_id;
  if (result.audio) return result.audio.file_id;
  // 表情包/动图
  if (result.sticker) return result.sticker.file_id;
  if (result.animation) return result.animation.file_id;

  return null;
}


/**
 * 提取 Telegram 视频缩略图 file_id。
 */
export function getVideoThumbId(response: any): string | null {
  if (!response.ok || !response.result) return null;

  const result = response.result;
  if (!result.video) return null;

  // 拿到 file_id 还需要通过 getFilePath 获取到具体文件路径，然后存到 video 的元数据中
  return response.result.video.thumbnail?.file_id || response.result.video.thumb?.file_id || null;
}

/**
 * 从 Telegram 上传响应中提取实际文件大小。
 * - sendPhoto: 取 photo 数组中最大变体的 file_size
 * - sendDocument/sendVideo/sendAudio: 取对应对象的 file_size
 */
export function getTgFileSize(response: any): number | undefined {
  if (!response?.ok || !response?.result) return undefined;

  const result = response.result;

  // sendPhoto 响应
  if (Array.isArray(result.photo)) {
    const variants = result.photo as TgPhotoVariant[];
    const validVariants = variants.filter((v) => typeof v.file_size === "number");
    if (validVariants.length === 0) return undefined;
    return Math.max(...validVariants.map((v) => v.file_size!));
  }

  // sendDocument/sendVideo/sendAudio 响应
  if (result.document?.file_size !== undefined) {
    return result.document.file_size;
  }
  if (result.video?.file_size !== undefined) {
    return result.video.file_size;
  }
  if (result.audio?.file_size !== undefined) {
    return result.audio.file_size;
  }

  return undefined;
}