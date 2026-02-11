import { ImageLoadMode } from "./wallpaper";

export * from "./wallpaper";
export * from "./music";

// === 全局设置相关类型 ===


export interface GeneralSettings {
  dataSaverThreshold: number; // MB
  safeMode: boolean;
  nsfwDetection: boolean;
  imageLoadMode: ImageLoadMode;
}


// 文件类型
export enum FileType {
  Image = 'img',
  Audio = 'audio',
  Video = 'video',
  Document = 'doc',
  Trash = 'trash',
}

export const trashPrefix = 'trash:';

// 统一API响应类型
export type ApiResponse<T = any> = {
  success: boolean;      // 请求是否成功
  data?: T;              // 响应数据，成功时返回
  message?: string;      // 提示消息或错误消息
};

// 存储在Cloudflare KV中的文件项
export type FileItem = {
  name: string; //  KV中的key
  metadata: FileMetadata;
  expiration?: number;
}

// 文件元数据类型
export type FileMetadata = {
  fileName: string;
  fileSize: number;
  uploadedAt: number;   // 时间戳
  liked: boolean;      // 是否被收藏
  tags?: FileTag[] | string[];
  chunkInfo?: ChunkInfo; // 分片信息（大文件分片上传时使用）
  thumbUrl?: string; // 缩略图URL
};

export enum FileTag {
  NSFW = 'nsfw',  // 非安全内容
  Private = 'private',  // 私有文件, 不允许其他人通过url直接访问到
}

// 分片信息（用于大文件分片上传）
export const chunkPrefix = 'chunk_';
export type ChunkInfo = {
  total: number;          // 总分片数
  uploadedIndices: number[]; // 已上传的分片索引
}

export type Chunk = {
  idx: number;
  file_id: string;  // Telegram: file_id / R2: chunk key
  size: number;      // 分片大小
}

// Cloudflare KV list参数
export type ListOptions = {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

// kv list的结果
export type ListFilesResponse = {
  keys: FileItem[];
  list_complete: boolean;
  cursor?: string;
  cacheStatus?: string | null;
}

// TODO: 分享相关类型（非前后端共享，待迁移）
export interface ShareItem {
  token: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  oneTime?: boolean;
  createdAt: number;
  expiresAt?: number;
}

export interface CreateShareRequest {
  fileKey: string;
  expireIn?: number;
  oneTime?: boolean;
}


export interface NetEaseStoreData {
  cookie: string;
  userId: string;
  profile: {
    nickname: string;
    avatarUrl: string;
    backgroundUrl: string;
    signature: string;
  } | null;
  updatedAt: number;
}

export const MAX_FILENAME_LENGTH = 128; // 最大文件名长度（包括扩展名）

export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_CHUNK_NUM = 50                 // 由于Cloudflare Worker的CPU限制，这里限制最大分片数为50, 即文件大小不得超过1000MB≈1GB
export const MAX_FILE_SIZE = MAX_CHUNK_SIZE * MAX_CHUNK_NUM
export const TRASH_EXPIRATION_TTL = 30 * 24 * 60 * 60; // 设置 30 天过期