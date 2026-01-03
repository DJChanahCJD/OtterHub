// types.ts
// 统一API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// 视图模式
export enum ViewMode {
  Grid = "grid",
  List = "list",
}

// 文件类型
export enum FileType {
  All = "all", // 所有文件
  Image = "img",
  Audio = "audio",
  Video = "video",
  Document = "doc",
}

export type FileItem = {
  name: string; //  KV中的key
  metadata: FileMetadata;
};

// 文件元数据类型
export type FileMetadata = {
  fileName: string;
  fileSize: number;
  uploadedAt: number; // 时间戳
  liked?: boolean; // 是否被收藏
  duration?: number; // 音视频时长（秒）
};

export type ListFilesRequest = {
  fileType?: FileType;
  // 分页参数
  limit?: string; // 默认且最大为1000
  cursor?: string; // Cloudflare KV的cursor是字符串类型
};

// kv list的结果
// response: Promise<{ keys: { name: string, expiration?: number, metadata?: object }[], list_complete: boolean, cursor: string }>
export type ListFilesResponse = {
  keys: FileItem[];
  list_complete: boolean;
  cursor?: string;
  cacheStatus?: string;
};
