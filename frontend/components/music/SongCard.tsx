import { useEffect, useState } from "react";
import { Heart, Music2, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MusicTrack, musicApi } from "@/lib/music-api";
import { useMusicStore } from "@/stores/music-store";
import { cn } from "@/lib/utils";

interface SongCardProps {
  track: MusicTrack | null;
}

export function SongCard({ track }: SongCardProps) {
  const [picUrl, setPicUrl] = useState<string | null>(null);
  const { isFavorite, addToFavorites, removeFromFavorites } = useMusicStore();

  /* ---------- Load album art ---------- */
  useEffect(() => {
    if (!track) {
      setPicUrl(null);
      return;
    }

    let cancelled = false;

    const loadPic = async () => {
      try {
        // 已是完整 URL，直接用
        if (track.pic_id?.startsWith("http")) {
          if (!cancelled) setPicUrl(track.pic_id);
          return;
        }

        const url = await musicApi.getPic(track.pic_id, track.source, 500);
        if (!cancelled) setPicUrl(url ?? null);
      } catch {
        if (!cancelled) setPicUrl(null);
      }
    };

    loadPic();
    return () => {
      cancelled = true;
    };
  }, [track]);

  /* ---------- Empty state ---------- */
  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
        <Music2 className="h-16 w-16 mb-4 opacity-20" />
        <p>暂无播放歌曲</p>
      </div>
    );
  }

  const isFav = isFavorite(track.id);

  return (
    <div className="flex flex-col items-center h-full p-6 space-y-6 bg-card/50">
      {/* Album Art */}
      <div className="relative aspect-square w-full max-w-[300px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50 bg-muted">
        {picUrl ? (
          <img
            src={picUrl}
            alt={track.name}
            className="w-full h-full object-cover animate-in fade-in duration-500"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Disc className="h-24 w-24 text-muted-foreground/30 animate-spin-slow" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="w-full space-y-2 text-center">
        <h2
          className="text-2xl font-bold leading-tight line-clamp-2"
          title={track.name}
        >
          {track.name}
        </h2>
        <p className="text-lg font-medium text-muted-foreground line-clamp-1">
          {track.artist.join(" / ")}
        </p>
        <p className="text-sm text-muted-foreground/60 line-clamp-1">
          {track.album}
        </p>
      </div>

      {/* Actions */}
      <Button
        variant="ghost"
        size="lg"
        className={cn(
          "h-12 w-12 p-0 rounded-full transition-all hover:scale-110",
          isFav
            ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
            : "text-muted-foreground hover:bg-muted",
        )}
        onClick={() =>
          isFav ? removeFromFavorites(track.id) : addToFavorites(track)
        }
      >
        <Heart
          className={cn(
            "h-6 w-6 transition-colors",
            isFav
              ? "text-pink-400 fill-pink-400"
              : "text-foreground/80 hover:text-pink-300",
          )}
        />
      </Button>
      <div className="text-xs text-muted-foreground">
        Powered by GD音乐台 (music.gdstudio.xyz)
      </div>
    </div>
  );
}
