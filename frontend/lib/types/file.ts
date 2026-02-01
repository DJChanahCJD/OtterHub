import { FileType } from "@shared/types";

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

export type ListFilesRequest = {
  fileType?: FileType;
  // 分页参数
  limit?: string; // 默认且最大为1000
  cursor?: string; // Cloudflare KV的cursor是字符串类型
};
