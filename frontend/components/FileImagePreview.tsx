"use client";

import { PhotoView, PhotoProvider } from "react-photo-view";
import { Image, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface FileImagePreviewProps {
  src: string;
  alt?: string;
  shouldLoad: boolean;
  shouldBlur: boolean;
  canPreview: boolean;
  iconSizeClass?: string;
  className?: string;
}

function PhotoToolbar({ rotate, onRotate, scale, onScale }: any) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onScale(scale + 0.2)}
        className="text-foreground/80 hover:text-foreground hover:bg-secondary/50 backdrop-blur-sm"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onScale(scale - 0.2)}
        className="text-foreground/80 hover:text-foreground hover:bg-secondary/50 backdrop-blur-sm"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRotate(rotate + 90)}
        className="text-foreground/80 hover:text-foreground hover:bg-secondary/50 backdrop-blur-sm"
      >
        <RotateCw className="h-5 w-5" />
      </Button>
    </div>
  );
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
        shouldBlur && "blur-xl",
        !shouldBlur && canPreview && "cursor-zoom-in"
      )}
    />
  ) : (
    <div className="flex items-center justify-center w-full h-full">
      <Image className={cn(iconSizeClass, "text-muted-foreground")} />
    </div>
  );

  // 只有：加载了图片 + 允许预览 + 非模糊状态 才启用 PhotoView
  if (shouldLoad && canPreview && !shouldBlur) {
    return (
      <PhotoProvider
        maskOpacity={0.85}
        toolbarRender={(props) => <PhotoToolbar {...props} />}
      >
        <PhotoView key={src} src={src}>{img}</PhotoView>
      </PhotoProvider>
    );
  }

  return img;
}
