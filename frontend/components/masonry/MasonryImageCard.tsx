"use client";

import { useFileUIStore } from "@/stores/file";
import { FileItem, FileType } from "@shared/types";
import { getFileUrl } from "@/lib/api";
import { shouldBlur, shouldLoadImage } from "@/lib/utils";
import { PhotoView } from "react-photo-view";
import { cn } from "@/lib/utils";
import { NsfwSign } from "../file-card/NsfwSign";
import { useGeneralSettingsStore } from "@/stores/general-store";
import { Image } from "lucide-react";

import { useState } from "react";

interface MasonryImageCardProps {
  file: FileItem;
}

export function MasonryImageCard({ file }: MasonryImageCardProps) {
  const { safeMode, imageLoadMode, dataSaverThreshold} = useGeneralSettingsStore()
  const [forceLoad, setForceLoad] = useState(false);
  
  const blur = shouldBlur({ safeMode, tags: file.metadata?.tags });
  const shouldLoad = shouldLoadImage({
    fileType: FileType.Image,
    imageLoadMode,
    fileSize: file.metadata.fileSize,
    threshold: dataSaverThreshold * 1024 * 1024,
  });
  
  const load = shouldLoad || forceLoad;

  const imageUrl = getFileUrl(file.name);

  // 图片内容 - 让图片自然渲染，保持原始宽高比
  const imgContent = load ? (
    <img
      src={imageUrl}
      alt={file.metadata.fileName}
      loading="lazy"
      decoding="async"
      className={cn(
        "w-full h-auto transition-all duration-300",
        blur && "blur-xl",
        !blur && "cursor-zoom-in"
      )}
    />
  ) : (
    <div 
      className="flex flex-col items-center justify-center w-full py-12 bg-secondary/10 text-muted-foreground gap-2 cursor-pointer hover:bg-secondary/20 transition-colors"
      onClick={() => setForceLoad(true)}
    >
      <Image className="w-8 h-8 opacity-50" />
      <span className="text-xs opacity-50">点击加载</span>
    </div>
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
