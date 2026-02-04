import { MusicTrack } from "@/lib/music-api";
import { Button } from "@/components/ui/button";
import { Play, Music } from "lucide-react";
import { MusicTrackList } from "./MusicTrackList";

interface MusicPlaylistViewProps {
  title: string;
  tracks: MusicTrack[];
  /** 
   * index 可选：
   * - 传入 index：播放指定歌曲
   * - 不传 index：播放全部（由上层/Store 决定起始点，如随机播放）
   */
  onPlay: (track: MusicTrack | null, index?: number) => void;
  onRemove?: (track: MusicTrack) => void;
  description?: string;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export function MusicPlaylistView({
  title,
  tracks,
  onPlay,
  onRemove,
  description,
  currentTrackId,
  isPlaying
}: MusicPlaylistViewProps) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <Music className="h-12 w-12 mb-4 opacity-20" />
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm opacity-60">暂无歌曲</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b flex items-end gap-6 bg-muted/10">
        <div className="h-32 w-32 bg-primary/10 rounded-lg flex items-center justify-center shadow-sm border">
          <Music className="h-12 w-12 text-primary/40" />
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{tracks.length} 首歌曲</span>
            {description && (
              <>
                <span>•</span>
                <span>{description}</span>
              </>
            )}
          </div>
          <div className="pt-2 flex gap-2">
             <Button 
                onClick={() => onPlay(null)} 
                className="rounded-full px-8"
                size="lg"
             >
                <Play className="mr-2 h-4 w-4 fill-current" /> 播放全部
             </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 bg-background/50">
        <MusicTrackList
          tracks={tracks}
          onPlay={(track) => onPlay(track, tracks.findIndex(t => t.id === track.id))}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
