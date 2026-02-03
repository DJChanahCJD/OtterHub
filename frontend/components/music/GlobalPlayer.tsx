import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic
} from "lucide-react";
import { AudioPlayerState, AudioPlayerControls } from "@/hooks/use-audio-player";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GlobalPlayerProps {
  state: AudioPlayerState;
  controls: AudioPlayerControls;
  onQualityChange: (quality: string) => void;
  quality: string;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GlobalPlayer({ state, controls, onQualityChange, quality }: GlobalPlayerProps) {
  const { isPlaying, currentTime, duration, volume, isRepeat, isShuffle } = state;
  const { togglePlay, next, previous, seek, setVolumeValue, toggleRepeat, toggleShuffle, toggleMute } = controls;

  return (
    <div className="h-24 border-t bg-background/95 backdrop-blur shadow-[0_-1px_10px_rgba(0,0,0,0.05)] px-6 flex items-center justify-between gap-6 z-50">
      
      {/* Controls */}
      <div className="flex items-center gap-4 flex-1 max-w-[200px]">
         <Button 
            variant="ghost" 
            size="icon" 
            className={cn("text-muted-foreground", isShuffle && "text-primary bg-primary/10")}
            onClick={toggleShuffle}
          >
            <Shuffle className="h-4 w-4" />
         </Button>
         <Button variant="ghost" size="icon" onClick={previous}>
            <SkipBack className="h-5 w-5 fill-current" />
         </Button>
         <Button 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform" 
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
         </Button>
         <Button variant="ghost" size="icon" onClick={next}>
            <SkipForward className="h-5 w-5 fill-current" />
         </Button>
         <Button 
            variant="ghost" 
            size="icon" 
            className={cn("text-muted-foreground", isRepeat && "text-primary bg-primary/10")}
            onClick={toggleRepeat}
          >
            {isRepeat ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
         </Button>
      </div>

      {/* Progress */}
      <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl">
        <div className="w-full flex items-center gap-3 text-xs font-medium text-muted-foreground tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={seek}
            className="flex-1 cursor-pointer"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume & Quality */}
      <div className="flex items-center gap-4 flex-1 justify-end max-w-[300px]">
        <Select value={quality} onValueChange={onQualityChange}>
            <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue placeholder="音质" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="128">标准</SelectItem>
                <SelectItem value="320">高品</SelectItem>
                <SelectItem value="999">无损</SelectItem>
            </SelectContent>
        </Select>

        <div className="flex items-center gap-2 w-32">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleMute}>
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={setVolumeValue}
                className="flex-1"
            />
        </div>
      </div>
    </div>
  );
}
