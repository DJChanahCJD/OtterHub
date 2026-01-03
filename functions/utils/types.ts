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
}

// 文件元数据类型
export type FileMetadata = {
  fileName: string;
  fileSize: number;
  uploadedAt: number;   // 时间戳
  duration?: number;    // 可选：音视频时长（秒）
};

// TODO: 分页参数
export type Pagination = {
  limit: number;
  cursor: number;
}

// kv list的结果
type ListFilesResponse = {
  keys: FileItem[];
  list_complete: true;
  cacheStatus: null;
}