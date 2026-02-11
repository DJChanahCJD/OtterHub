"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  ListPlus,
  Plus,
  ListVideo,
  Heart,
  Download,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AudioPlayerState,
  AudioPlayerControls,
} from "@/hooks/use-audio-player";
import { downloadMusicTrack } from "@/lib/utils/download";
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
import { MusicTrack } from "@shared/types";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";
import { PlayerProgressBar } from "./PlayerProgressBar";
import { useShallow } from "zustand/react/shallow";
import { FullScreenPlayer } from "./FullScreenPlayer";
import { musicApi } from "@/lib/music-api";
import { PlayerQueuePopover } from "./PlayerQueuePopover";
import { PlayerControls } from "./PlayerControls";
import { PlayerTrackInfo } from "./PlayerTrackInfo";
import { AddToPlaylistDialog } from "./AddToPlaylistDialog";
import { MusicTrackMobileMenu } from "./MusicTrackMobileMenu";

interface GlobalPlayerProps {
  state: AudioPlayerState;
  controls: AudioPlayerControls;
  currentTrack: MusicTrack | null;
  onTogglePlaylist?: () => void;
}

export function GlobalPlayer({
  state,
  controls,
  currentTrack,
  onTogglePlaylist,
}: GlobalPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isRepeat,
    isShuffle,
    isLoading,
  } = state;
  const {
    togglePlay,
    next,
    previous,
    seek,
    setVolumeValue,
    toggleRepeat,
    toggleShuffle,
    playTrack,
  } = controls;

  const {
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    playlists,
    addToPlaylist,
    createPlaylist,
    queue,
    currentIndex,
    clearQueue,
    quality,
    setQuality,
    reshuffle,
  } = useMusicStore(
    useShallow((state) => ({
      isFavorite: state.isFavorite,
      addToFavorites: state.addToFavorites,
      removeFromFavorites: state.removeFromFavorites,
      playlists: state.playlists,
      addToPlaylist: state.addToPlaylist,
      createPlaylist: state.createPlaylist,
      queue: state.queue,
      currentIndex: state.currentIndex,
      clearQueue: state.clearQueue,
      quality: state.quality,
      setQuality: state.setQuality,
      reshuffle: state.reshuffle,
    })),
  );

  const handleClearQueue = () => {
    if (confirm("确定要清空播放列表吗？")) {
      clearQueue();
      toast.success("播放列表已清空");
    }
  };

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const { addToQueue } = useMusicStore()

  useEffect(() => {
    if (!currentTrack) {
      setCoverUrl(null);
      return;
    }

    let isActive = true;

    const fetchCover = async () => {
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

    setCoverUrl(null);
    fetchCover();

    return () => {
      isActive = false;
    };
  }, [currentTrack]);

  const handleToggleFavorite = () => {
    if (!currentTrack) return;
    if (isFavorite(currentTrack.id)) {
      removeFromFavorites(currentTrack.id);
      toast.success("已取消喜欢");
    } else {
      addToFavorites(currentTrack);
      toast.success("已喜欢");
    }
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    downloadMusicTrack(currentTrack);
  };

  const VolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-5 w-5" />;
    if (volume < 0.5) return <Volume1 className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  };

  const handleToggleMode = () => {
    if (isRepeat) {
      toggleRepeat();
      if (!isShuffle) toggleShuffle();
    } else if (isShuffle) {
      toggleShuffle();
    } else {
      toggleRepeat();
    }
  };

  const ModeIcon = () => {
    if (isRepeat) return <Repeat1 className="h-4 w-4" />;
    if (isShuffle) return <Shuffle className="h-4 w-4" />;
    return <Repeat className="h-4 w-4" />;
  };

  const getModeTitle = () => {
    if (isRepeat) return "单曲循环";
    if (isShuffle) return "随机播放";
    return "列表循环";
  };

  return (
    <>
      <FullScreenPlayer
        isFullScreen={isFullScreen}
        onClose={() => setIsFullScreen(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        coverUrl={coverUrl}
        isFavorite={currentTrack ? isFavorite(currentTrack.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Bottom Player Bar */}
      <div
        className={cn(
          "relative flex flex-col w-full backdrop-blur-md border-t z-50 pt-1 transition-all duration-500",
          isFullScreen
            ? "bg-black/80 border-white/10 text-white dark"
            : "bg-background/70 border-border",
        )}
      >
        {/* 1. Top Progress Bar */}
        <PlayerProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
        />

        {/* 2. Main Controls Area (h-24 for mobile) */}
        <div className="flex items-center justify-between px-4 h-24 gap-4">
          {/* Left: Info - PC Only */}
          <div className="hidden md:flex flex-1 min-w-0">
            <PlayerTrackInfo
              track={currentTrack}
              coverUrl={coverUrl}
              isFullScreen={isFullScreen}
              isFavorite={currentTrack ? isFavorite(currentTrack.id) : false}
              onToggleFullScreen={() => setIsFullScreen((v) => !v)}
              onToggleFavorite={handleToggleFavorite}
              onDownload={handleDownload}
            />
          </div>

          {/* Mobile: Left - Album + Song Name (Non-Fullscreen Only) */}
          {!isFullScreen && (
            <div className="md:hidden flex-1 min-w-0">
              <PlayerTrackInfo
                track={currentTrack}
                coverUrl={coverUrl}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen(true)}
              />
            </div>
          )}

          {/* Center: Controls */}
          <div className="flex-1 flex items-center justify-center gap-4">
            {/* PC: Full Controls */}
            <div className="hidden md:flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                onClick={handleToggleMode}
                title={getModeTitle()}
              >
                <ModeIcon />
              </Button>

              <PlayerControls
                isPlaying={isPlaying}
                isLoading={isLoading}
                onPlayToggle={togglePlay}
                onPrev={previous}
                onNext={next}
                size="lg"
              />

              <PlayerQueuePopover
                queue={queue}
                currentIndex={currentIndex}
                isPlaying={isPlaying}
                isShuffle={isShuffle}
                onPlay={(index) => {
                  playTrack(index);
                  controls.play();
                }}
                onClear={handleClearQueue}
                onReshuffle={reshuffle}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    title="播放列表"
                  >
                    <ListVideo className="h-4 w-4" />
                  </Button>
                }
              />
            </div>

            {/* Mobile: Non-Fullscreen - Play Button and Queue Button */}
            {!isFullScreen && (
              <div className="md:hidden flex flex-end items-center gap-2">
                <PlayerControls
                  isPlaying={isPlaying}
                  isLoading={isLoading}
                  onPlayToggle={togglePlay}
                  onPrev={previous}
                  onNext={next}
                  size="lg"
                  showPrevNext={false}
                />
                <PlayerQueuePopover
                  queue={queue}
                  currentIndex={currentIndex}
                  isPlaying={isPlaying}
                  isShuffle={isShuffle}
                  onPlay={playTrack}
                  onClear={handleClearQueue}
                  onReshuffle={reshuffle}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      title="播放列表"
                    >
                      <ListVideo className="h-5 w-5" />
                    </Button>
                  }
                />
                
                {currentTrack && (
                   <>
                     <MusicTrackMobileMenu 
                        track={currentTrack}
                        open={isMobileMenuOpen}
                        onOpenChange={setIsMobileMenuOpen}
                        onAddToQueue={() => {
                           addToQueue(currentTrack);
                           toast.success("已加入播放列表");
                        }}
                        onAddToPlaylistTrigger={() => setIsAddToPlaylistOpen(true)}
                        onDownload={handleDownload}
                        onToggleLike={handleToggleFavorite}
                        isFavorite={isFavorite(currentTrack.id)}
                        showThemeToggle={true}
                     />
                     <AddToPlaylistDialog 
                        open={isAddToPlaylistOpen}
                        onOpenChange={setIsAddToPlaylistOpen}
                        track={currentTrack}
                     />
                   </>
                )}
              </div>
            )}

            {/* Mobile: Fullscreen - 5 Buttons Centered */}
            {isFullScreen && (
              <div className="md:hidden flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  onClick={handleToggleMode}
                  title={getModeTitle()}
                >
                  <ModeIcon />
                </Button>

                <PlayerControls
                  isPlaying={isPlaying}
                  isLoading={isLoading}
                  onPlayToggle={togglePlay}
                  onPrev={previous}
                  onNext={next}
                  size="lg"
                />

                <PlayerQueuePopover
                  queue={queue}
                  currentIndex={currentIndex}
                  isPlaying={isPlaying}
                  isShuffle={isShuffle}
                  onPlay={playTrack}
                  onClear={handleClearQueue}
                  onReshuffle={reshuffle}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      title="播放列表"
                    >
                      <ListVideo className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            )}
          </div>

          {/* Right: Settings - PC Only */}
          <div className="hidden md:flex flex-1 min-w-0 items-center justify-end gap-3 text-xs">
            {/* Volume Control */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
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
                <div
                  className="
                    absolute bottom-[-6px] left-1/2 -translate-x-1/2
                    w-3 h-3 rotate-45
                    bg-popover border-r border-b
                  "
                />

                <Slider
                  orientation="vertical"
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={setVolumeValue}
                  className="h-24 py-1"
                />

                <span className="text-xs text-muted-foreground w-6 text-center">
                  {Math.round(volume * 100)}%
                </span>
              </PopoverContent>
            </Popover>

            {/* Add to Playlist */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  title="加入歌单"
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
                        addToPlaylist(p.id, currentTrack);
                        toast.success(`已添加到歌单「${p.name}」`);
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

            {/* Quality Control */}
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="h-7 px-2 bg-transparent border-muted hover:bg-muted/20">
                <SelectValue placeholder="音质" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="128">标准 (128kbps)</SelectItem>
                <SelectItem value="192">高品 (192kbps)</SelectItem>
                <SelectItem value="320">极高 (320kbps)</SelectItem>
                <SelectItem value="999">无损 (999kbps)</SelectItem>
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
}
