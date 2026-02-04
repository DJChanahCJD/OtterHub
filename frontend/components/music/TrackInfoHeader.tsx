import { MusicTrack } from "@shared/types";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrackInfoHeaderProps {
  track: MusicTrack | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  variant?: "mobile" | "desktop";
}

export function TrackInfoHeader({
  track,
  isFavorite = false,
  onToggleFavorite,
  variant = "desktop",
}: TrackInfoHeaderProps) {
  if (!track) return null;

  const titleSize = variant === "mobile" ? "text-xl" : "text-2xl";
  const textSize = variant === "mobile" ? "text-sm" : "text-sm";

  return (
    <div className="flex flex-col gap-2 pb-4 border-b border-border/40">
      <h3 className={`${titleSize} font-bold tracking-tight text-foreground/90 text-center`}>
        {track.name}
      </h3>
      <p className={`${textSize} text-muted-foreground/80 text-center`}>
        歌手：{track.artist.join(" / ")}
      </p>
      {variant === "mobile" && onToggleFavorite && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={onToggleFavorite}
            title="喜欢"
          >
            <Heart
              className={cn(
                "h-5 w-5",
                isFavorite && "fill-primary text-primary"
              )}
            />
          </Button>
        </div>
      )}
    </div>
  );
}
