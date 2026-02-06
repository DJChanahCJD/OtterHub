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

export const binaryExtensions = [
  // 文档
  ".pdf", ".epub", ".mobi", ".azw3",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  // 压缩包
  ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
  // 可执行文件/系统文件
  ".exe", ".msi", ".apk", ".app", ".dmg", ".pkg",
  ".iso", ".img", ".bin",
  // 设计文件
  ".psd", ".ai", ".sketch", ".fig",
  // 字体
  ".ttf", ".otf", ".woff", ".woff2",
  // 编译/数据库
  ".pyc", ".pyo", ".pyd", ".class", ".o", ".so", ".dll", ".dylib",
  ".db", ".sqlite", ".mdb"
];