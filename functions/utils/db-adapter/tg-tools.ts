// functions/utils/db-adapter/tg-tools.ts
import { getFileExt } from "../file-tools";
import { FileType } from "../types";

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