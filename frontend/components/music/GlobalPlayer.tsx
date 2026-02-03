import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Heart,
  Download,
  Plus,
  Music2,
  ListPlus,
} from "lucide-react";
import {
  AudioPlayerState,
  AudioPlayerControls,
} from "@/hooks/use-audio-player";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MusicTrack, musicApi } from "@/lib/music-api";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerProgressBar } from "./PlayerProgressBar";

interface GlobalPlayerProps {
  state: AudioPlayerState;
  controls: AudioPlayerControls;
  onQualityChange: (quality: string) => void;
  quality: string;
  currentTrack: MusicTrack | null;
  onTogglePlaylist?: () => void;
}

export function GlobalPlayer({
  state,
  controls,
  onQualityChange,
  quality,
  currentTrack,
  onTogglePlaylist,
}: GlobalPlayerProps) {
  const { isPlaying, currentTime, duration, volume, isRepeat, isShuffle } =
    state;
  const {
    togglePlay,
    next,
    previous,
    seek,
    setVolumeValue,
    toggleRepeat,
    toggleShuffle,
    toggleMute,
    playTrack,
  } = controls;

  const {
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    playlists,
    addToUserPlaylist,
    createPlaylist,
    queue,
    currentIndex,
  } = useMusicStore();

  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setCoverUrl(null);
      return;
    }

    let isActive = true;

    const fetchCover = async () => {
      // If no pic_id, don't fetch
      if (!currentTrack.pic_id) {
        if (isActive) setCoverUrl(null);
        return;
      }

      try {
        const url = await musicApi.getPic(
          currentTrack.pic_id,
          currentTrack.source,
        );
        if (isActive) {
          setCoverUrl(url);
        }
      } catch (error) {
        console.error("Failed to fetch album art:", error);
        if (isActive) setCoverUrl(null);
      }
    };

    setCoverUrl(null); // Clear previous cover immediately
    fetchCover();

    return () => {
      isActive = false;
    };
  }, [currentTrack]);

  const handleToggleFavorite = () => {
    if (!currentTrack) return;
    if (isFavorite(currentTrack.id)) {
      removeFromFavorites(currentTrack.id);
      toast.success("已取消收藏");
    } else {
      addToFavorites(currentTrack);
      toast.success("已收藏");
    }
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    try {
      const url = await musicApi.getUrl(currentTrack.id, currentTrack.source);
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("无法获取下载链接");
      }
    } catch (e) {
      toast.error("下载失败");
    }
  };

  const VolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-5 w-5" />;
    if (volume < 0.5) return <Volume1 className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  };

  return (
    <div className="relative flex flex-col w-full bg-background/95 backdrop-blur border-t z-50 shadow-[0_-1px_10px_rgba(0,0,0,0.05)] pt-1">
      {/* 1. Top Progress Bar */}
      <PlayerProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
      />

      {/* 2. Main Controls Area (h-20) */}
      <div className="flex items-center justify-between px-4 h-20 gap-4">
        {/* Left: Info */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {currentTrack ? (
            <>
              {/* Album Art */}
              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={currentTrack.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Music2 className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0">
                <div className="text-sm font-semibold truncate hover:underline cursor-pointer">
                  {currentTrack.name}
                </div>
                <div className="text-xs text-muted-foreground truncate hover:underline cursor-pointer">
                  {currentTrack.artist.join(" / ")}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={handleToggleFavorite}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorite(currentTrack.id) &&
                        "fill-primary text-primary",
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={handleDownload}
                  title="下载"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 opacity-50">
              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                <Music2 className="h-6 w-6" />
              </div>
              <div className="text-sm">未播放</div>
            </div>
          )}
        </div>

        {/* Center: Controls */}
        <div className="flex-1 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-foreground h-8 w-8",
              isShuffle && "text-primary hover:text-primary",
            )}
            onClick={toggleShuffle}
            title={isShuffle ? "随机播放" : "顺序播放"}
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={previous}
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </Button>

          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={next}
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-foreground h-8 w-8",
              isRepeat && "text-primary hover:text-primary",
            )}
            onClick={toggleRepeat}
            title={isRepeat ? "单曲循环" : "列表循环"}
          >
            {isRepeat ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </Button>

          {/* Queue Button (Desktop Only? Or replace togglePlaylist logic) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground ml-2"
                title="播放列表"
              >
                <ListMusic className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              className="w-80 p-0 h-96 flex flex-col"
            >
              <div className="p-3 border-b text-sm font-medium flex justify-between items-center">
                <span>播放队列 ({queue.length})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                >
                  清空
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1">
                  {queue.map((track, i) => (
                    <div
                      key={`${track.id}-${i}`}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-muted/50",
                        i === currentIndex && "bg-muted/50 text-primary",
                      )}
                      onClick={() => playTrack(i)}
                    >
                      {i === currentIndex && isPlaying ? (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <span className="animate-spin text-primary">💿</span>
                        </div>
                      ) : (
                        <span className="w-4 text-center text-xs text-muted-foreground font-mono">
                          {i + 1}
                        </span>
                      )}
                      <div className="flex-1 min-w-0 truncate">
                        <span className="font-medium">{track.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {" "}
                          - {track.artist.join("/")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Settings */}
        <div className="flex-1 flex items-center justify-end gap-3 text-xs">
          <Select value={quality} onValueChange={onQualityChange}>
            <SelectTrigger className="h-7 px-2 bg-transparent border-muted hover:bg-muted/20">
              <SelectValue placeholder="音质" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="128">标准 (128kbps)</SelectItem>
              <SelectItem value="192">高品 (192kbps)</SelectItem>
              <SelectItem value="320">极高 (320kbps)</SelectItem>
              <SelectItem value="999">无损 (999kbps)</SelectItem>
              {/* TODO: 切换音质后自动切换到当前进度 */}
            </SelectContent>
          </Select>

          {/* Add to Playlist */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                title="收藏到歌单"
                disabled={!currentTrack}
              >
                <ListPlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-48 p-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                添加到歌单
              </div>
              {playlists.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                  onClick={() => {
                    if (currentTrack) {
                      addToUserPlaylist(p.id, currentTrack);
                      toast.success("已添加到歌单");
                    }
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
                  // todo: 复用侧边栏的新建歌单逻辑
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={toggleMute}
              >
                <VolumeIcon />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="center"
              sideOffset={8}
              className="
                relative flex flex-col items-center gap-2
                w-auto p-3
              "
            >
              {/* Arrow */}
              <div
                className="
                  absolute bottom-[-6px] left-1/2 -translate-x-1/2
                  w-3 h-3 rotate-45
                  bg-popover border-r border-b
                "
              />

              {/* Slider */}
              <Slider
                orientation="vertical"
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={setVolumeValue}
                className="h-24 py-1"
              />

              {/* Percentage */}
              <span className="text-xs text-muted-foreground w-6 text-center">
                {Math.round(volume * 100)}%
              </span>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
