import { BrowseMode, FileTag, FileType } from "./types";

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

// 判断是否应该加载图片（BrowseMode + 文件大小）
export function shouldLoadImage({
  fileType,
  browseMode,
  fileSize,
  threshold,
}: {
  fileType: FileType;
  browseMode: BrowseMode;
  fileSize?: number;
  threshold: number;
}): boolean {
  if (fileType !== FileType.Image) return false;
  if (browseMode === BrowseMode.NoImage) return false;
  if (
    browseMode === BrowseMode.SmartNoImage &&
    fileSize &&
    fileSize > threshold
  ) {
    return false;
  }
  return true;
}
