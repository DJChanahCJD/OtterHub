import { ImageLoadMode } from "./wallpaper";

export * from "./wallpaper";

// === 全局设置相关类型 ===


export interface GeneralSettings {
  dataSaverThreshold: number; // MB
  safeMode: boolean;
  nsfwDetection: boolean;
  imageLoadMode: ImageLoadMode;
  defaultUploadTags: FileTag[]; // 默认上传标签
  enableImageAnalysis: boolean; // 是否启用上传时自动 AI 图片分析
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
  tags?: FileTag[];
  chunkInfo?: ChunkInfo; // 分片信息（大文件分片上传时使用）
  thumbUrl?: string; // 缩略图URL
  desc?: string;     // 图片简短描述（上传后 AI 自动分析填充）
};

export enum FileTag {
  NSFW = 'nsfw',  // 非安全内容
  Private = 'private',  // 私有文件, 不允许其他人通过url直接访问到
}

export type UploadTagsInput = FileTag[];

export interface SingleUploadPayload {
  nsfw?: boolean;
  tags?: UploadTagsInput;
}

export interface ChunkUploadInitPayload {
  fileType: FileType;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  tags?: UploadTagsInput;
}

export interface UrlUploadPayload {
  url: string;
  fileName?: string;
  isNsfw?: boolean;
  tags?: UploadTagsInput;
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

// 分享类型
export type ShareType = 'single' | 'bundle';

// 打包分享中的文件信息
export interface BundleFileInfo {
  key: string;
  name: string;
  size: number;
  mimeType?: string;
}

// === 分享数据存储类型（用于 KV 存储和后端处理） ===

// 单文件分享数据
export interface SingleShareData {
  type: 'single';
  fileKey: string;
  fileName: string;
  fileSize: number;
  createdAt: number;
  expiresAt?: number;
}

// 打包分享数据
export interface BundleShareData {
  type: 'bundle';
  fileKeys: string[];
  files: BundleFileInfo[];
  bundleName?: string;    // 用户自定义名称，可选
  totalSize: number;
  createdAt: number;
  expiresAt?: number;
}

// 分享数据联合类型
export type ShareData = SingleShareData | BundleShareData;

// === 分享列表项类型（API /list 返回给前端） ===
export type ShareListItem = {
  token: string;
} & (
  | {
      type: 'single';
      fileKey: string;
      fileName: string;
      fileSize: number;
      createdAt: number;
      expiresAt?: number;
    }
  | {
      type: 'bundle';
      files: BundleFileInfo[];
      bundleName?: string;
      totalSize: number;
      createdAt: number;
      expiresAt?: number;
    }
);

// 创建分享请求
export interface CreateShareRequest {
  type?: ShareType;
  fileKey?: string;       // single 模式
  fileKeys?: string[];    // bundle 模式
  bundleName?: string;    // 用户自定义打包名称（bundle 模式）
  expireIn?: number;
}

// 分享元数据响应
export interface ShareMetaResponse {
  type: ShareType;
  // single 模式字段
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  // bundle 模式字段
  files?: BundleFileInfo[];
  bundleName?: string;  // bundle 显示名称
  totalSize?: number;   // bundle 总大小
  // 通用字段
  createdAt: number;
  expiresAt?: number;
}

export const MAX_FILENAME_LENGTH = 128; // 最大文件名长度（包括扩展名）
export const MAX_DESC_LENGTH = 300; // 最大描述长度

export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB, TG BOT API 可供下载的最大文件大小为20MB

// 打包分享最大文件数量限制（防止 Cloudflare Worker CPU 超时）
export const MAX_FILES_IN_BUNDLE = 50;
export const MAX_CHUNK_NUM = 50                 // 由于Cloudflare Worker的CPU限制，这里限制最大分片数为50, 即文件大小不得超过1000MB≈1GB
export const MAX_FILE_SIZE = MAX_CHUNK_SIZE * MAX_CHUNK_NUM
export const TRASH_EXPIRATION_TTL = 30 * 24 * 60 * 60; // 设置 30 天过期
