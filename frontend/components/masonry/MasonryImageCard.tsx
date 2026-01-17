"use client";

import { useFileUIStore } from "@/lib/file-store";
import { FileItem, FileType } from "@/lib/types";
import { getFileUrl } from "@/lib/api";
import { shouldBlur, shouldLoadImage } from "@/lib/utils";
import { PhotoView } from "react-photo-view";
import { cn } from "@/lib/utils";
import { SMART_NO_IMAGE_THRESHOLD } from "../file-card";
import { NsfwSign } from "../file-card/NsfwSign";

interface MasonryImageCardProps {
  file: FileItem;
}

export function MasonryImageCard({ file }: MasonryImageCardProps) {
  const { safeMode, imageLoadMode: loadImageMode } = useFileUIStore();

  const blur = shouldBlur({ safeMode, tags: file.metadata?.tags });
  const load = shouldLoadImage({
    fileType: FileType.Image,
    loadImageMode,
    fileSize: file.metadata.fileSize,
    threshold: SMART_NO_IMAGE_THRESHOLD,
  });

  const imageUrl = getFileUrl(file.name);

  // 图片内容 - 让图片自然渲染，保持原始宽高比
  const imgContent = (
    <img
      src={imageUrl}
      alt={file.metadata.fileName}
      loading="lazy"
      decoding="async"
      className={cn(
        "w-full h-auto transition-all duration-300",
        blur && "blur-xl",
        !blur && "cursor-zoom-in",
      )}
    />
  );
  return (
    <div className="relative group rounded-xl overflow-hidden bg-glass-bg border border-glass-border">
      {/* 实际图片（加载完成后显示） */}
      {!blur ? (
        <PhotoView src={imageUrl}>{imgContent}</PhotoView>
      ) : (
        imgContent
      )}

      {/* NSFW 提示 */}
      {blur && <NsfwSign />}

      {/* 底部文件名悬浮 */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-xs text-white truncate">{file.metadata.fileName}</p>
      </div>
    </div>
  );
}
