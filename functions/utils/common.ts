// 判断是否为开发环境
export function isDev(env: any): boolean {
  const isDev = !env?.TG_Bot_Token;
  console.log("isDev:", isDev);
  return isDev;
}

// 获取文件扩展名
export function getFileExt(fileName: string): string {
  return fileName.split(".").pop()!.toLowerCase();
}

// 文件类型枚举
export enum FileType {
  image = "image",
  audio = "audio",
  video = "video",
  document = "document",
}

// 文件类型前缀映射
const FILE_PREFIX: Record<FileType, string> = {
  [FileType.image]: "img",
  [FileType.audio]: "audio",
  [FileType.video]: "video",
  [FileType.document]: "doc",
};

// 构建存储键
export function buildKeyId(fileType: FileType, fullFileId: string): string {
  return `${FILE_PREFIX[fileType]}_${fullFileId}`;
}

// 从存储键提取文件ID
export function getFileIdFromKey(key: string): string {
  return key.replace(/^(img|audio|video|doc)_/, "");
}

// 生成唯一文件ID
// 当前只给R2用，TG的文件ID由TG API返回
export function getUniqueFileId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}


// === 类型定义 ===

// 元数据类型定义
// export type BaseMetadata = {
//   fileName: string;
//   fileSize: number;
//   uploadTime: number;   //  时间戳
// };

// export type ImgMetadata = BaseMetadata;
// export type DocMetadata = BaseMetadata;
// export type AudioMetadata = BaseMetadata & { duration: number };
// export type VideoMetadata = BaseMetadata & { duration: number };

// export type FileMetadata =
//   | ImgMetadata
//   | AudioMetadata
//   | VideoMetadata
//   | DocMetadata;

export type FileMetadata = {
  fileName: string;
  fileSize: number;
  uploadTime: number;   //  时间戳

  // 视频和音频文件的时长（秒）
  duration?: number;
}
