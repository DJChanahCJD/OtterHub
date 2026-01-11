"use client";

import { useFileStore } from "@/lib/file-store";
import { FileItem, FileType } from "@/lib/types";
import { getFileUrl } from "@/lib/api";
import { shouldBlur, shouldLoadImage } from "@/lib/file-preview";
import { FileImagePreview } from "@/components/file-image-preview";
import { SMART_NO_IMAGE_THRESHOLD } from "./file-card";

interface MasonryImageCardProps {
  file: FileItem;
}

export function MasonryImageCard({ file }: MasonryImageCardProps) {
  const safeMode = useFileStore((state) => state.safeMode);
  const loadImageMode = useFileStore((state) => state.imageLoadMode);

  const blur = shouldBlur({ safeMode, tags: file.metadata?.tags });
  const load = shouldLoadImage({
    fileType: FileType.Image,
    loadImageMode,
    fileSize: file.metadata.fileSize,
    threshold: SMART_NO_IMAGE_THRESHOLD,
  });

  const imageUrl = getFileUrl(file.name);

  return (
    <div className="relative group rounded-xl overflow-hidden bg-white/10 border border-white/10">
      <FileImagePreview
        src={imageUrl}
        alt={file.metadata.fileName}
        shouldLoad={load}
        shouldBlur={blur}
        canPreview={!blur}
        className="w-full"
      />

      {/* NSFW 提示 */}
      {blur && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <span className="text-sm font-medium text-amber-300">NSFW Content</span>
        </div>
      )}

      {/* 底部文件名悬浮 */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{file.metadata.fileName}</p>
      </div>
    </div>
  );
}
