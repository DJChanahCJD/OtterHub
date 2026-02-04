"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MusicTrack } from "@shared/types";
import { LyricsPanel } from "./LyricsPanel";

interface FullScreenPlayerProps {
  isFullScreen: boolean;
  onClose: () => void;
  currentTrack: MusicTrack | null;
  currentTime: number;
  coverUrl: string | null;
}

export function FullScreenPlayer({
  isFullScreen,
  onClose,
  currentTrack,
  currentTime,
  coverUrl,
}: FullScreenPlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[49] bg-background transition-transform duration-500 ease-in-out flex flex-col",
        isFullScreen ? "translate-y-0" : "translate-y-[100%]"
      )}
    >
      {/* Top Control (Down Arrow) */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background/50 hover:bg-background/80"
          onClick={onClose}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row p-8 pb-24 gap-8 overflow-hidden">
        {/* Left: Big Album Art */}
        <div className="flex-1 flex items-center justify-center p-8 min-h-0">
          <div className="aspect-square w-full max-w-[50vh] max-h-full rounded-xl shadow-2xl overflow-hidden bg-muted flex items-center justify-center">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentTrack?.name || "Album Art"}
                className="h-full w-full object-cover"
              />
            ) : (
              <Music2 className="h-24 w-24 text-muted-foreground/30" />
            )}
          </div>
        </div>

        {/* Right: Lyrics + Info */}
        <div className="flex-1 h-full min-h-0">
          <LyricsPanel track={currentTrack} currentTime={currentTime} />
        </div>
      </div>
    </div>,
    document.body
  );
}
