import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { MusicTrack } from "@shared/types";
import { Download, Heart, ListPlus, MoreVertical, Plus, Trash2, Moon, Sun } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { MusicCover } from "./MusicCover";
import { musicApi } from "@/lib/music-api";

interface MusicTrackMobileMenuProps {
  track: MusicTrack;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToQueue: () => void;
  onAddToPlaylistTrigger: () => void;
  onDownload: () => void;
  onToggleLike: () => void;
  isFavorite: boolean;
  onRemove?: () => void;
  hideLike?: boolean;
  hideAddToQueue?: boolean;
  hideAddToPlaylist?: boolean;
  customActions?: ReactNode;
  showThemeToggle?: boolean;
}

export function MusicTrackMobileMenu({
  track,
  open,
  onOpenChange,
  onAddToQueue,
  onAddToPlaylistTrigger,
  onDownload,
  onToggleLike,
  isFavorite,
  onRemove,
  hideLike,
  hideAddToQueue,
  hideAddToPlaylist,
  customActions,
  showThemeToggle,
}: MusicTrackMobileMenuProps) {
  const { theme, setTheme } = useTheme();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const fetchCover = async () => {
      if (!track.pic_id) return;
      try {
        const url = await musicApi.getPic(track.pic_id, track.source, 200);
        if (active) setCoverUrl(url);
      } catch (e) {
        console.error("Failed to fetch cover in MusicTrackMobileMenu:", e);
      }
    };
    fetchCover();
    return () => {
      active = false;
    };
  }, [track.pic_id, track.source, open]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
          }}
          title="更多操作"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent onClick={(e) => e.stopPropagation()}>
        <div className="p-4 flex flex-col gap-2">
          {/* Header with Cover and Info */}
          <div className="flex items-center gap-4 px-2 py-4 border-b mb-2">
            <MusicCover
              src={coverUrl}
              alt={track.name}
              className="h-16 w-16 rounded-lg shadow-md"
              iconClassName="h-8 w-8"
            />
            <div className="min-w-0">
              <div className="font-bold truncate text-lg">{track.name}</div>
              <div className="text-sm text-muted-foreground truncate">
                {track.artist.join(" / ")}
              </div>
            </div>
          </div>

          {!hideAddToQueue && (
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={() => {
                onAddToQueue();
                onOpenChange(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> 添加到播放列表
            </Button>
          )}

          {!hideAddToPlaylist && (
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={() => {
                onOpenChange(false);
                onAddToPlaylistTrigger();
              }}
            >
              <ListPlus className="mr-2 h-4 w-4" /> 添加到歌单
            </Button>
          )}

          <Button
            variant="ghost"
            className="justify-start w-full"
            onClick={() => {
              onDownload();
              onOpenChange(false);
            }}
          >
            <Download className="mr-2 h-4 w-4" /> 下载
          </Button>

          {!hideLike && (
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={() => {
                onToggleLike();
                onOpenChange(false);
              }}
            >
              <Heart
                className={cn(
                  "mr-2 h-4 w-4",
                  isFavorite && "fill-primary text-primary"
                )}
              />
              {isFavorite ? "取消喜欢" : "喜欢"}
            </Button>
          )}

          {(onRemove || customActions || showThemeToggle) && <div className="my-1 border-t" />}

          {onRemove && (
            <Button
              variant="ghost"
              className="justify-start w-full text-destructive hover:text-destructive"
              onClick={() => {
                onOpenChange(false);
                if (window.confirm(`确定移除歌曲「${track.name}」吗？`)) {
                   onRemove();
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> 移除
            </Button>
          )}

          {showThemeToggle && (
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                onOpenChange(false);
              }}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            </Button>
          )}

          {customActions && (
             <div className="flex flex-col gap-2">
                 {/* 
                    Since customActions is a ReactNode, we can't easily style it. 
                    But we wrap it to ensure layout.
                 */}
                 {customActions}
             </div>
          )}
        </div>
        <DrawerClose asChild>
          <Button variant="outline" className="mx-4 mb-4">
            取消
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
