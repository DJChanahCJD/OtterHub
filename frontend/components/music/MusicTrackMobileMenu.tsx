import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { MusicTrack } from "@shared/types";
import { Download, Heart, ListPlus, MoreVertical, Plus, Trash2 } from "lucide-react";
import { ReactNode } from "react";

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
}: MusicTrackMobileMenuProps) {
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

          {(onRemove || customActions) && <div className="my-1 border-t" />}

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
