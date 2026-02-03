import { MusicTrack } from "@/lib/music-api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2, Clock, Music } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-2 border-b text-xs text-muted-foreground font-medium uppercase tracking-wider sticky top-0 bg-background z-10">
          <div className="w-8 text-center">#</div>
          <div>标题</div>
          <div>专辑</div>
          <div className="w-12 text-center"><Clock className="h-3 w-3 mx-auto" /></div>
        </div>
        <ScrollArea className="h-full">
          <div className="pb-20">
            {tracks.map((track, i) => {
              const isCurrent = track.id === currentTrackId;
              
              return (
                <div 
                  key={`${track.id}-${i}`}
                  className={cn(
                    "group grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-2.5 items-center hover:bg-muted/50 transition-colors cursor-default text-sm",
                    isCurrent && "bg-muted/50 text-primary"
                  )}
                  onDoubleClick={() => onPlay(track, i)}
                >
                  <div className="w-8 text-center flex justify-center items-center">
                    {isCurrent && isPlaying ? (
                       <div className="relative h-3 w-3">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                       </div>
                    ) : (
                      <span className="group-hover:hidden font-mono text-muted-foreground">{i + 1}</span>
                    )}
                    <Play 
                      className={cn(
                        "h-3 w-3 fill-current hidden cursor-pointer", 
                        !isCurrent && "group-hover:block",
                        isCurrent && !isPlaying && "block"
                      )} 
                      onClick={() => onPlay(track, i)}
                    />
                  </div>
                  
                  <div className="min-w-0">
                    <div className={cn("font-medium truncate", isCurrent ? "text-primary" : "text-foreground")}>
                      {track.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate block md:hidden">
                      {track.artist.join(", ")}
                    </div>
                  </div>
                  
                  <div className="text-muted-foreground truncate hidden md:block">
                    {track.album}
                  </div>
                  
                  <div className="w-12 text-center flex justify-center items-center">
                    {onRemove ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(track);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">--:--</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
