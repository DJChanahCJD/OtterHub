import { MusicTrack } from "@/lib/music-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Heart, Plus, ListPlus, ListMusic } from "lucide-react";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

interface MusicTrackItemProps {
  track: MusicTrack;
  index: number;
  isCurrent?: boolean;
  isPlaying?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onPlay: () => void;
  // Optional overrides or disabling default actions
  hideLike?: boolean;
  hideAddToQueue?: boolean;
  hideAddToPlaylist?: boolean;
  // Custom actions to render (e.g. Delete button)
  customActions?: React.ReactNode;
  className?: string;
}

export function MusicTrackItem({
  track,
  index,
  isCurrent,
  isPlaying,
  isSelected,
  onSelect,
  onPlay,
  hideLike,
  hideAddToQueue,
  hideAddToPlaylist,
  customActions,
  className,
}: MusicTrackItemProps) {
  const { addToFavorites, addToQueue, playlists, addToUserPlaylist, createPlaylist } = useMusicStore();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all",
        isSelected 
          ? "bg-primary/10 border-primary/20" 
          : "border-transparent hover:bg-muted",
        className
      )}
    >
      <div className="w-8 flex justify-center text-muted-foreground">
          {isCurrent && isPlaying ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
          ) : (
              <span className="text-xs font-mono opacity-50">{index + 1}</span>
          )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", isCurrent && "text-primary")}>
          {track.name}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {track.artist.join(" / ")} · {track.album}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            title="播放"
          >
            <Play className="h-4 w-4" />
         </Button>
         
         {!hideLike && (
           <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                addToFavorites(track);
                toast.success("已收藏");
              }}
              title="收藏"
            >
              <Heart className="h-4 w-4" />
           </Button>
         )}

         {!hideAddToQueue && (
           <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(track);
                toast.success("已加入播放队列");
              }}
              title="添加到播放队列"
            >
              <Plus className="h-4 w-4" />
           </Button>
         )}

         {!hideAddToPlaylist && (
           <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title="添加到歌单"
                >
                  <ListPlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="center" className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">添加到歌单</div>
              {playlists.map(p => (
                <div 
                    key={p.id} 
                    className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                    onClick={() => {
                      addToUserPlaylist(p.id, track);
                      toast.success(`已添加到歌单「${p.name}」`);
                      setIsPopoverOpen(false);
                    }}
                >
                    <ListMusic className="mr-2 h-4 w-4 opacity-50" />
                    <span className="truncate">{p.name}</span>
                </div>
              ))}
              <div className="border-t my-1" />
              <div 
                  className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-muted-foreground"
                  onClick={() => {
                    const name = window.prompt("请输入新歌单名称");
                    if (name) {
                      createPlaylist(name);
                      toast.success("已创建歌单");
                    }
                  }}
              >
                  <Plus className="mr-2 h-4 w-4" /> 新建歌单
              </div>
            </PopoverContent>
           </Popover>
         )}

         {customActions}
      </div>
    </div>
  );
}
