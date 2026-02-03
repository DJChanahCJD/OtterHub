import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MusicTrack } from "@/lib/music-api";
import { useMusicStore } from "@/stores/music-store";
import {
  Play,
  Trash2,
  ListMusic,
  Heart,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaylistPanelProps {
  onPlay: (track: MusicTrack, list: MusicTrack[]) => void;
  currentTrackId?: string;
}

export function PlaylistPanel({
  onPlay,
  currentTrackId,
}: PlaylistPanelProps) {
  const {
    playlist,
    favorites,
    removeFromPlaylist,
    removeFromFavorites,
    clearPlaylist,
    setPlaylist,
  } = useMusicStore();

  const TrackItem = ({
    track,
    listType,
    index,
  }: {
    track: MusicTrack;
    listType: "playlist" | "favorite";
    index: number;
  }) => {
    const isPlaying = track.id === currentTrackId;

    return (
      <div
        className={cn(
          "group flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50",
          isPlaying && "bg-primary/10 hover:bg-primary/15",
        )}
      >
        <div className="w-8 text-center text-sm text-muted-foreground font-mono">
          {isPlaying ? (
            <Play className="h-4 w-4 mx-auto fill-primary text-primary" />
          ) : (
            index + 1
          )}
        </div>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            if (listType === "favorite") onPlay(track, favorites);
            else onPlay(track, playlist);
          }}
        >
          <div
            className={cn("font-medium truncate", isPlaying && "text-primary")}
          >
            {track.name}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {track.artist.join(" / ")} - {track.album}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {listType === "playlist" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                removeFromPlaylist(track.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {listType === "favorite" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                removeFromFavorites(track.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background/50 border-x">
      <Tabs defaultValue="playlist" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-4 pb-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="playlist">
              <ListMusic className="h-4 w-4 mr-2" />
              播放列表
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />
              我的收藏
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 播放列表 */}
        <TabsContent
          value="playlist"
          className="flex-1 min-h-0 m-0 flex flex-col"
        >
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 text-xs text-muted-foreground flex justify-between items-center border-b">
              <span>共 {playlist.length} 首歌曲</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive"
                onClick={clearPlaylist}
                title="清空播放列表"
                disabled={playlist.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {playlist.map((track, i) => (
                  <TrackItem
                    key={`${track.id}-${i}`}
                    track={track}
                    listType="playlist"
                    index={i}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* 收藏 */}
        <TabsContent
          value="favorites"
          className="flex-1 min-h-0 m-0 flex flex-col"
        >
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 text-xs text-muted-foreground flex justify-between items-center border-b">
              <span>共 {favorites.length} 首收藏</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setPlaylist(favorites)}
                title="将收藏加入播放列表"
                disabled={favorites.length === 0}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {favorites.map((track, i) => (
                  <TrackItem
                    key={`${track.id}-${i}`}
                    track={track}
                    listType="favorite"
                    index={i}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
