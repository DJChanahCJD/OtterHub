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
}

export type FileItem = {
  name: string; //  KV中的key
  metadata: FileMetadata;
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



// === 常量 ===
export const MAX_CONCURRENTS = 3  // 最大并发上传数
export const MAX_CHUNK_SIZE = 20 * 1024 * 1024 // 20MB

// Cloudflare Worker免费版限制: https://developers.cloudflare.com/workers/platform/limits/#worker-limits
// 最大128MB内存, 因此在下载大文件后，再次下载可能会报错
export const DIRECT_DOWNLOAD_LIMIT = MAX_CHUNK_SIZE * 2 // 小的媒体文件可通过a.click直接下载，超过则让用户通过浏览器控件下载
export const MAX_CHUNK_NUM = 50 // 由于Cloudflare Worker的CPU限制，这里限制最大分片数为50, 即文件大小不得超过1000MB≈1GB
export const MAX_FILE_SIZE = MAX_CHUNK_SIZE * MAX_CHUNK_NUM

// === 音乐播放器相关类型 ===

// 音乐来源
export enum MusicSource {
  Netease = "netease",     // 网易云音乐
  QQ = "tencent",          // QQ音乐
  Kugou = "kugou",         // 酷狗音乐
  Kuwo = "kuwo",           // 酷我音乐
  Migu = "migu",           // 咪咕音乐
}

// 播放器来源
export enum PlayerSource {
  Local = "local",         // 本地音频文件
  Online = "online",       // 在线搜索结果
}

// 音乐曲目信息
export interface MusicTrack {
  id: string;              // 音乐ID
  name: string;            // 歌曲名
  artist: string;          // 歌手
  album: string;           // 专辑
  duration?: number;       // 时长（秒）
  source: MusicSource;     // 来源
  url?: string;            // 播放URL（动态获取）
  coverUrl?: string;       // 封面图URL
  lyricId?: string;        // 歌词ID
  picId?: string;          // 图片ID
  isLocal?: boolean;       // 是否为本地文件
  fileItem?: FileItem;     // 本地文件项（如果是本地音频）
}

// 音乐搜索选项
export interface SearchOptions {
  source?: MusicSource;    // 指定来源（可选）
  count?: number;          // 返回数量（默认20）
  pages?: number;          // 页码（默认1）
}

// 歌词行（LRC格式）
export interface LyricLine {
  time: number;            // 时间戳（秒）
  text: string;            // 歌词文本
}

// 歌词响应
export interface LyricResponse {
  lyric: string;            // 原始歌词（LRC格式）
  tlyric?: string;         // 翻译歌词（可选）
}

