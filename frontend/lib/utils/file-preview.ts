import { FileTag, FileType } from "@shared/types";
import { ImageLoadMode } from "../types";


// 判断是否为 NSFW 内容
export function isNSFW(tags?: (FileTag | string)[]): boolean {
  return tags?.includes(FileTag.NSFW) ?? false;
}

// 判断是否应该模糊（SafeMode + NSFW）
export function shouldBlur({
  safeMode,
  tags,
}: {
  safeMode: boolean;
  tags?: (FileTag | string)[];
}): boolean {
  return safeMode && isNSFW(tags);
}

// 判断是否应该加载图片（LoadImageMode + 文件大小）
export function shouldLoadImage({
  fileType,
  imageLoadMode,
  fileSize,
  threshold,
}: {
  fileType: FileType;
  imageLoadMode: ImageLoadMode;
  fileSize?: number;
  threshold: number;
}): boolean {
  if (fileType !== FileType.Image) return false;
  if (imageLoadMode === ImageLoadMode.NoImage) return false;
  if (
    imageLoadMode === ImageLoadMode.DataSaver &&
    fileSize &&
    fileSize > threshold
  ) {
    return false;
  }
  return true;
}
