import { MusicTrack } from "@shared/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, Heart, Plus, ListPlus, ListMusic, Download, Trash2 } from "lucide-react";
import { downloadMusicTrack } from "@/lib/utils/download";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { AddToPlaylistDialog } from "./AddToPlaylistDialog";
import { MusicTrackMobileMenu } from "./MusicTrackMobileMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface MusicTrackItemProps {
  track: MusicTrack;
  index: number;
  isCurrent?: boolean;
  isPlaying?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  showCheckbox?: boolean;
  onPlay: () => void;
  // Optional overrides or disabling default actions
  hideLike?: boolean;
  hideAddToQueue?: boolean;
  hideAddToPlaylist?: boolean;
  // Custom actions to render (e.g. Delete button)
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function MusicTrackItem({
  track,
  index,
  isCurrent,
  isPlaying,
  isSelected,
  onSelect,
  showCheckbox,
  onPlay,
  hideLike,
  hideAddToQueue,
  hideAddToPlaylist,
  onRemove,
  className,
  style,
}: MusicTrackItemProps) {
  const { addToFavorites, removeFromFavorites, isFavorite, addToQueue, playlists, addToPlaylist, createPlaylist } = useMusicStore();
  const [isPlaylistPopoverOpen, setIsPlaylistPopoverOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const isMobile = useIsMobile();
  return (
    <div
      style={style}
      onClick={showCheckbox ? onSelect : onPlay}
      className={cn(
        "group grid gap-2 items-center px-3 md:px-4 py-2 rounded-md cursor-pointer transition-colors text-sm",
        "grid-cols-[3rem_1fr_auto]",
        "md:grid-cols-[3rem_1.5fr_1fr_auto]",
        isSelected && showCheckbox
          ? "bg-primary/10" 
          : "hover:bg-muted/50",
        className
      )}
    >
      {/* Column 1: Index / Checkbox / Play State */}
      <div className="flex justify-center shrink-0">
          {showCheckbox ? (
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={() => onSelect?.()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="relative w-4 h-4 flex items-center justify-center">
                {/* Playing State */}
                {isCurrent && isPlaying ? (
                   <>
                     <span className="group-hover:hidden relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                     </span>
                     <Pause 
                        className="hidden group-hover:block h-4 w-4 fill-primary text-primary cursor-pointer" 
                        onClick={(e) => {
                           e.stopPropagation();
                           onPlay();
                        }}
                     />
                   </>
                ) : (
                   <>
                      <span className={cn("group-hover:hidden font-mono text-muted-foreground opacity-70", isCurrent && "text-primary opacity-100")}>
                        {index + 1}
                      </span>
                      <Play 
                        className="hidden group-hover:block h-4 w-4 fill-foreground text-foreground opacity-70 hover:opacity-100 cursor-pointer" 
                        onClick={(e) => {
                           e.stopPropagation();
                           onPlay();
                        }}
                      />
                   </>
                )}
            </div>
          )}
      </div>

      {/* Column 2: Title & Artist */}
      <div className="min-w-0">
        <div className={cn("font-medium truncate", isCurrent && "text-primary")}>
          {track.name}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {track.artist.join(" / ")}
          {isMobile && ` - ${track.album}`}
        </div>
      </div>

      {/* Column 3: Album (desktop only) */}
      <div className="hidden md:block min-w-0 text-muted-foreground truncate" title={track.album}>
        {track.album}
      </div>

      {/* Column 4: Actions */}
      <div className="flex items-center justify-end gap-1">
         {!showCheckbox && (
            <>
                {/* 常用功能按钮 - 始终显示 */}
                {!hideLike && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isFavorite(track.id)) {
                          removeFromFavorites(track.id);
                          toast.success("已取消喜欢");
                        } else {
                          addToFavorites(track);
                          toast.success("已喜欢");
                        }
                    }}
                    title={isFavorite(track.id) ? "取消喜欢" : "喜欢"}
                    >
                    <Heart 
                      className={cn(
                        "h-4 w-4",
                        isFavorite(track.id) && "fill-primary text-primary"
                      )} 
                    />
                </Button>
                )}

                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadMusicTrack(track);
                    }}
                    title="下载"
                    >
                    <Download className="h-4 w-4" />
                </Button>

                {/* 桌面端：显示所有按钮 */}
                <div className="hidden md:flex items-center gap-1">
                    {!hideAddToQueue && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(track);
                            toast.success("已加入播放列表");
                        }}
                        title="添加到播放列表"
                        >
                        <Plus className="h-4 w-4" />
                    </Button>
                    )}

                    {!hideAddToPlaylist && (
                    <Popover open={isPlaylistPopoverOpen} onOpenChange={setIsPlaylistPopoverOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
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
                                addToPlaylist(p.id, track);
                                toast.success(`已添加到歌单「${p.name}」`);
                                setIsPlaylistPopoverOpen(false);
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

                    {onRemove && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`确定移除歌曲「${track.name}」吗？`)) {
                            onRemove();
                          }
                        }}
                        title="移除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                </div>

                {/* 移动端：折叠到 MoreVertical 按钮 */}
                <div className="md:hidden flex items-center">
                    <MusicTrackMobileMenu
                        track={track}
                        open={isMobileMenuOpen}
                        onOpenChange={setIsMobileMenuOpen}
                        onAddToQueue={() => {
                            addToQueue(track);
                            toast.success("已加入播放列表");
                        }}
                        onAddToPlaylistTrigger={() => {
                            setIsAddToPlaylistOpen(true);
                        }}
                        onDownload={() => downloadMusicTrack(track)}
                        onToggleLike={() => {
                            if (isFavorite(track.id)) {
                                removeFromFavorites(track.id);
                                toast.success("已取消喜欢");
                            } else {
                                addToFavorites(track);
                                toast.success("已喜欢");
                            }
                        }}
                        isFavorite={isFavorite(track.id)}
                        onRemove={onRemove}
                        hideLike={hideLike}
                        hideAddToQueue={hideAddToQueue}
                        hideAddToPlaylist={hideAddToPlaylist}
                    />
                    
                    <AddToPlaylistDialog 
                        open={isAddToPlaylistOpen} 
                        onOpenChange={setIsAddToPlaylistOpen} 
                        track={track} 
                    />
                </div>
            </>
         )}
      </div>
    </div>
  );
}
