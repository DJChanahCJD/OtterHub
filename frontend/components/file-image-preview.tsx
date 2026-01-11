"use client";

import { PhotoView } from "react-photo-view";
import { Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileImagePreviewProps {
  src: string;
  alt?: string;
  shouldLoad: boolean;
  shouldBlur: boolean;
  canPreview: boolean;
  iconSizeClass?: string;
  className?: string;
}

export function FileImagePreview({
  src,
  alt,
  shouldLoad,
  shouldBlur,
  canPreview,
  iconSizeClass = "h-16 w-16",
  className,
}: FileImagePreviewProps) {
  const img = shouldLoad ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "w-full h-full object-cover transition-all duration-300",
        shouldBlur && "blur-2xl scale-110",
        !shouldBlur && canPreview && "cursor-zoom-in"
      )}
    />
  ) : (
    <div className="flex items-center justify-center w-full h-full">
      <Image className={cn(iconSizeClass, "text-white/40")} />
    </div>
  );


  // 只有：加载了图片 + 允许预览 + 非模糊状态 才启用 PhotoView
  if (shouldLoad && canPreview && !shouldBlur) {
    return <PhotoView src={src}>{img}</PhotoView>;
  }

  return img;
}
