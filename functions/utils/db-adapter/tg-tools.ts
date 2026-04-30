import {
  getContentTypeByExt,
  getFileExt,
  getFileTypeByMimeOrExt,
} from "../file";
import { FileType } from "@shared/types";

const TELEGRAM_UPLOAD_NOTIFY_DISABLED = new Set([
  "0",
  "false",
  "no",
  "off",
  "disable",
  "disabled",
]);

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
export async function getTgFile(
  fileId: string,
  botToken: string
): Promise<Response> {
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
    const blob = await file.arrayBuffer().then((buffer) => new Blob([buffer]));

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
  const mime = file.type || getContentTypeByExt(ext);
  const fileType = getFileTypeByMimeOrExt(mime, ext);

  // GIF 特判
  if (
    mime === "image/gif" ||
    ext === "gif" ||
    mime === "image/webp" ||
    ext === "webp"
  ) {
    return {
      apiEndpoint: "sendDocument",
      field: "document",
      fileType: FileType.Image,
      ext,
    };
  }

  if (fileType === FileType.Image) {
    return {
      apiEndpoint: "sendPhoto",
      field: "photo",
      fileType: FileType.Image,
      ext,
    };
  }

  if (fileType === FileType.Video) {
    return {
      apiEndpoint: "sendVideo",
      field: "video",
      fileType: FileType.Video,
      ext,
    };
  }

  if (fileType === FileType.Audio) {
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

type TgWebhookMedia = {
  kind: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ext: string;
  fileType: FileType;
  messageId: number;
  previewFileId?: string;
};

/**
 * 从 Telegram 图片尺寸列表中提取原图与预览图 file_id。
 */
function extractPhotoVariantIds(variants: TgPhotoVariant[]): TgImageVariantIds {
  const validVariants = variants.filter(
    (item) => typeof item.file_id === "string"
  );
  if (!validVariants.length) {
    return { fileId: null, previewFileId: null };
  }

  const sortedVariants = [...validVariants].sort(
    (prev, current) => (prev.file_size ?? 0) - (current.file_size ?? 0)
  );
  const originalVariant = sortedVariants[sortedVariants.length - 1];
  const previewVariant =
    [...sortedVariants]
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

  // 对于大于 5MB 的通过 sendDocument 上传的图片，似乎没有 thumb 返回
  const documentResult = response.result.document as
    | TgDocumentResult
    | undefined;
  if (!documentResult?.file_id) {
    return { fileId: null, previewFileId: null };
  }

  const previewFileId =
    documentResult.thumbnail?.file_id ?? documentResult.thumb?.file_id ?? null;

  return {
    fileId: documentResult.file_id,
    previewFileId:
      previewFileId && previewFileId !== documentResult.file_id
        ? previewFileId
        : null,
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
  return (
    response.result.video.thumbnail?.file_id ||
    response.result.video.thumb?.file_id ||
    null
  );
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
    const validVariants = variants.filter(
      (v) => typeof v.file_size === "number"
    );
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

/**
 * 从 Telegram 入站消息中提取 OtterHub 可注册的媒体文件信息。
 */
export function getTelegramFileFromMessage(
  message: any
): TgWebhookMedia | null {
  if (!message) return null;

  if (Array.isArray(message.photo) && message.photo.length) {
    const imageVariantIds = extractPhotoVariantIds(message.photo);
    if (!imageVariantIds.fileId) return null;

    return {
      kind: "photo",
      fileId: imageVariantIds.fileId,
      fileName: `photo_${message.message_id || Date.now()}.jpg`,
      fileSize: imageVariantIds.fileSize ?? 0,
      mimeType: "image/jpeg",
      ext: "jpg",
      fileType: FileType.Image,
      messageId: Number(message.message_id || 0),
      previewFileId: imageVariantIds.previewFileId ?? undefined,
    };
  }

  const candidates = [
    {
      key: "document",
      fallbackName: "document",
      fallbackMime: "application/octet-stream",
    },
    { key: "video", fallbackName: "video", fallbackMime: "video/mp4" },
    { key: "audio", fallbackName: "audio", fallbackMime: "audio/mpeg" },
    { key: "voice", fallbackName: "voice", fallbackMime: "audio/ogg" },
    { key: "animation", fallbackName: "animation", fallbackMime: "video/mp4" },
    {
      key: "video_note",
      fallbackName: "video_note",
      fallbackMime: "video/mp4",
    },
    { key: "sticker", fallbackName: "sticker", fallbackMime: "image/webp" },
  ];

  for (const item of candidates) {
    const data = message[item.key];
    if (!data?.file_id) continue;

    const mimeType = data.mime_type || item.fallbackMime;
    const rawFileName = data.file_name || "";
    const ext = getFileExt(rawFileName) || getFileExtByMime(mimeType) || "bin";
    const fileName =
      rawFileName ||
      `${item.fallbackName}_${message.message_id || Date.now()}.${ext}`;
    const fileType = getFileTypeByMimeOrExt(mimeType, ext);
    const previewFileId =
      data.thumbnail?.file_id || data.thumb?.file_id || undefined;

    return {
      kind: item.key,
      fileId: data.file_id,
      fileName,
      fileSize: Number(data.file_size || 0),
      mimeType,
      ext,
      fileType,
      messageId: Number(message.message_id || 0),
      previewFileId: previewFileId !== data.file_id ? previewFileId : undefined,
    };
  }

  return null;
}

/**
 * 构建公开文件访问链接。
 */
export function buildTelegramDirectLink(
  publicBaseUrl: string | undefined,
  fallbackOrigin: string,
  key: string
): string {
  const base =
    normalizePublicBaseUrl(publicBaseUrl) ||
    normalizePublicBaseUrl(fallbackOrigin);
  const path = `/file/${key}`;
  return base ? `${base}${path}` : path;
}

/**
 * 判断是否需要在 Telegram 中回复上传完成通知。
 */
export function shouldNotifyTelegramUpload(
  rawValue: string | undefined
): boolean {
  if (!rawValue) return true;
  return !TELEGRAM_UPLOAD_NOTIFY_DISABLED.has(rawValue.trim().toLowerCase());
}

/**
 * 发送 Telegram 上传完成通知；回复失败时退回普通消息。
 */
export async function sendTelegramUploadNotice(
  botToken: string,
  payload: {
    chatId: string | number;
    replyToMessageId?: number;
    directLink: string;
    fileId: string;
    messageId?: number;
    fileName: string;
    fileSize: number;
  }
): Promise<{ ok: boolean; skipped?: boolean; data?: any; error?: string }> {
  const text = buildTelegramUploadNoticeText(payload);
  const basePayload = {
    chat_id: payload.chatId,
    text,
    disable_web_page_preview: true,
  };

  try {
    let result = await postTelegramMessage(botToken, {
      ...basePayload,
      ...(payload.replyToMessageId
        ? {
            reply_to_message_id: payload.replyToMessageId,
            allow_sending_without_reply: true,
          }
        : {}),
    });

    if (!result.ok && payload.replyToMessageId) {
      result = await postTelegramMessage(botToken, basePayload);
    }

    return result;
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

/**
 * 按 MIME 类型推断 Telegram 入站文件扩展名。
 */
function getFileExtByMime(mimeType: string): string {
  const contentType = mimeType.split(";")[0].trim().toLowerCase();
  const extByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-matroska": "mkv",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/flac": "flac",
    "audio/aac": "aac",
    "audio/mp4": "m4a",
    "audio/opus": "opus",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/x-7z-compressed": "7z",
    "application/x-rar-compressed": "rar",
    "text/plain": "txt",
  };

  return extByMime[contentType] || "";
}

/**
 * 规范化用于回复直链的公开基础 URL。
 */
function normalizePublicBaseUrl(rawValue: string | undefined): string {
  if (!rawValue) return "";

  try {
    return new URL(rawValue).toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/**
 * 生成 Telegram 通知文本。
 */
function buildTelegramUploadNoticeText(payload: {
  directLink: string;
  fileId: string;
  messageId?: number;
  fileName: string;
  fileSize: number;
}): string {
  const lines = [
    "Upload completed",
    `Name: ${truncateFileName(payload.fileName, 120) || "unnamed"}`,
    `Size: ${formatFileSize(payload.fileSize)}`,
    `Direct Link: ${payload.directLink}`,
    `File ID: ${payload.fileId}`,
  ];

  if (payload.messageId) {
    lines.push(`Message ID: ${payload.messageId}`);
  }

  return lines.join("\n");
}

/**
 * 发送 Telegram sendMessage 请求。
 */
async function postTelegramMessage(
  botToken: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data: any }> {
  const response = await fetch(buildTgApiUrl(botToken, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data?.ok, data };
}

/**
 * 格式化文件大小，供 Telegram 通知展示。
 */
function formatFileSize(bytes: number): string {
  const numeric = Number(bytes || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0 B";
  if (numeric < 1024) return `${numeric} B`;
  if (numeric < 1024 * 1024) return `${(numeric / 1024).toFixed(2)} KB`;
  if (numeric < 1024 * 1024 * 1024) {
    return `${(numeric / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(numeric / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 截断过长文件名，避免 Telegram 通知过长。
 */
function truncateFileName(fileName: string, limit: number): string {
  return fileName.length <= limit ? fileName : fileName.slice(0, limit);
}
