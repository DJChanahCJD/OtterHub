// types.ts

// Cloudflare 配置
export enum CF {
  KV_NAME = 'oh_file_url',
  R2_BUCKET = 'oh_file_r2',
}

// 文件类型
export enum FileType {
  Image = 'img',
  Audio = 'audio',
  Video = 'video',
  Document = 'doc',
}

// 文件元数据类型
export type FileMetadata = {
  fileName: string;
  fileSize: number;
  uploadTime: number;   // 时间戳
  duration?: number;    // 可选：音视频时长（秒）
};