"use client";

import { PhotoView } from "react-photo-view";
import { Image, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useFileUIStore } from "@/stores/file";

interface FileImagePreviewProps {
  src: string;
  alt?: string;
  fileKey: string;
  shouldLoad: boolean;
  shouldBlur: boolean;
  canPreview: boolean;
  iconClassName?: string;
  className?: string;
}

export function PhotoToolbar({ rotate, onRotate, scale, onScale }: any) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onScale(scale + 0.2)}
        className="text-white/80 hover:text-foreground hover:bg-secondary/50 backdrop-blur-sm"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onScale(scale - 0.2)}
        className="text-white/80 hover:text-foreground hover:bg-secondary/50 backdrop-blur-sm"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRotate(rotate + 90)}
        className="text-white/80 hover:text-foreground hover:bg-secondary/50 backdrop-blur-sm"
      >
        <RotateCw className="h-5 w-5" />
      </Button>
    </div>
  );
}

export function FileImagePreview({
  src,
  alt,
  fileKey,
  shouldLoad,
  shouldBlur,
  canPreview,
  iconClassName = "h-16 w-16 text-blue-300",
  className,
}: FileImagePreviewProps) {
  const { forceLoadFiles, addForceLoadFile } = useFileUIStore();
  const isLoaded = shouldLoad || forceLoadFiles.includes(fileKey);

  const img = isLoaded ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "w-full h-full object-cover transition-all duration-300",
        shouldBlur && "blur-xl",
        !shouldBlur && canPreview && "cursor-zoom-in",
      )}
    />
  ) : (
    <div 
      className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-white/5 transition-colors group" 
      onClick={(e) => {
        e.stopPropagation();
        addForceLoadFile(fileKey);
      }}
      title="点击加载图片"
    >
      <Image className={cn(iconClassName, "group-hover:opacity-80 transition-opacity")} />
    </div>
  );

  // 只有：加载了图片 + 允许预览 + 非模糊状态 才启用 PhotoView
  if (isLoaded && canPreview && !shouldBlur) {
    return (
      <PhotoView src={src}>
        {img}
      </PhotoView>
    );
  }

  return img;
}
