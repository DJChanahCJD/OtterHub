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
      className={cn(
        "w-full h-full object-cover transition-all duration-300",
        shouldBlur && "blur-2xl scale-110",
        !shouldBlur && canPreview && "cursor-zoom-in"
      )}
    />
  ) : (
    <Image className={cn(iconSizeClass, "text-white/40")} />
  );

  if (!shouldLoad || !canPreview) {
    return <div className={className}>{img}</div>;
  }

  return (
    <PhotoView src={src}>
      <div className={className}>{img}</div>
    </PhotoView>
  );
}
