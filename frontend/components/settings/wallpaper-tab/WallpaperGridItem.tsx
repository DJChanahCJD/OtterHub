import { UnifiedWallpaper } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface WallpaperGridItemProps {
  wallpaper: UnifiedWallpaper;
  isUploaded: boolean;
  isUploading: boolean;
  onUpload: (e: React.MouseEvent, wp: UnifiedWallpaper) => void;
  onPreview: (url: string) => void;
}

export function WallpaperGridItem({
  wallpaper,
  isUploaded,
  isUploading,
  onUpload,
  onPreview,
}: WallpaperGridItemProps) {
  return (
    <div
      className="group relative aspect-[3/2] rounded-xl overflow-hidden border border-border/50 bg-muted shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1.5 cursor-zoom-in"
      onClick={() => onPreview(wallpaper.previewUrl)}
    >
      <img
        src={wallpaper.previewUrl}
        alt={wallpaper.source}
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />

      <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
        <Badge
          variant="secondary"
          className="bg-black/40 text-white/90 border-none text-[8px] h-4 backdrop-blur-md px-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
        >
          {wallpaper.source}
        </Badge>
      </div>

      <div className="absolute bottom-2 right-2 z-10 pointer-events-auto">
        <Button
          size="icon"
          className={cn(
            "h-8 w-8 rounded-xl backdrop-blur-md text-white border-none shadow-lg active:scale-95 transition-all",
            isUploaded
              ? "bg-emerald-500/60"
              : "bg-black/40 hover:bg-black/60",
          )}
          onClick={(e) => onUpload(e, wallpaper)}
          title={
            isUploading
              ? "上传中"
              : isUploaded
                ? "已保存到云端"
                : "上传壁纸"
          }
          disabled={isUploading || isUploaded}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isUploaded ? (
            <Check className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
