import { MusicTrack } from "@/lib/music-api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2, Music } from "lucide-react";
import { MusicTrackItem } from "./MusicTrackItem";

interface MusicPlaylistViewProps {
  title: string;
  tracks: MusicTrack[];
  onPlay: (track: MusicTrack, index: number) => void;
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
          <div className="text-sm font-medium text-primary uppercase tracking-wider">Playlist</div>
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
          <div className="pt-2">
             <Button 
                onClick={() => onPlay(tracks[0], 0)} 
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
        <ScrollArea className="h-full">
          <div className="pb-20 p-2 space-y-1">
            {tracks.map((track, i) => (
              <MusicTrackItem
                key={`${track.id}-${i}`}
                track={track}
                index={i}
                isCurrent={track.id === currentTrackId}
                isPlaying={isPlaying}
                onPlay={() => onPlay(track, i)}
                customActions={onRemove && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定从歌单「${title}」移除歌曲「${track.name}」吗？`)) {
                        onRemove(track);
                      }
                    }}
                    title="从歌单移除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
