// 视图模式
export enum ViewMode {
  Grid = "grid",
  List = "list",
  Masonry = "masonry",
}

export enum SortType {
  UploadedAt = "uploadedAt",
  Name = "name",
  FileSize = "fileSize",
}

export enum SortOrder {
  Asc = "asc",
  Desc = "desc",
}

// 图片加载模式
export enum ImageLoadMode {
  Default = "default",      // 默认模式：正常显示所有内容
  DataSaver = "data-saver",   // 省流模式：不加载 >5MB 的图片
  NoImage = "no-image", // 无图模式：不加载任何图片
}

// 文件类型
export enum FileType {
  Image = "img",
  Audio = "audio",
  Video = "video",
  Document = "doc",
  Trash = "trash",
}
export const trashPrefix = 'trash:';

export type FileItem = {
  name: string; //  KV中的key
  metadata: FileMetadata;
  expiration?: number;
};

// 文件元数据类型
export type FileMetadata = {
  fileName: string;
  fileSize: number;
  uploadedAt: number;   // 时间戳
  liked: boolean;      // 是否被收藏
  tags?: FileTag[] | string[];
  chunkInfo?: ChunkInfo; // 分片信息（大文件分片上传时使用）
  thumbUrl?: string; // 缩略图url
};

export enum FileTag {
  NSFW = 'nsfw',  // 非安全内容
  Private = 'private',  // 私有文件, 不允许其他人通过url直接访问到
}

// 分片信息（用于大文件分片上传）
export type ChunkInfo = {
  total: number;          // 总分片数
  chunks: Chunk[];        // 已上传的分片
  
  uploadedIndices: number[]; // 已上传的分片索引
}
export type Chunk = {
  idx: number;
  file_id: string;
  size: number; // 分片大小
}


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
