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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function FullScreenPlayer({
  isFullScreen,
  onClose,
  currentTrack,
  currentTime,
  coverUrl,
  isFavorite = false,
  onToggleFavorite,
}: FullScreenPlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-49 bg-transparent transition-transform duration-500 ease-in-out flex flex-col dark",
        isFullScreen ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Dynamic Background Layer */}
      <div className="absolute inset-0 z-[-1] overflow-hidden bg-zinc-950">
        {coverUrl ? (
          <>
            {/* Blured Image Background */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-2xl scale-110 opacity-40"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          /* Fallback Gradient */
          <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-slate-900 to-black" />
        )}
      </div>


      {/* Top Control (Down Arrow) */}
      <div className="absolute top-3 left-3 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          onClick={onClose}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row p-8 pb-24 gap-8 overflow-hidden relative z-10">
        {/* Left: Big Album Art (PC) */}
        <div className="hidden md:flex flex-1 items-center justify-center p-8 min-h-0">
          <div className="aspect-square w-full max-w-[50vh] max-h-full rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden bg-muted/20 flex items-center justify-center">
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

        {/* Right: Lyrics + Info (PC) */}
        <div className="hidden md:block flex-1 h-full min-h-0">
          <LyricsPanel track={currentTrack} currentTime={currentTime} />
        </div>

        {/* Mobile Layout: Single Column */}
        <div className="flex flex-col items-center justify-center w-full h-full md:hidden py-8 gap-6">
          {/* Small Album Art (Mobile) */}
          <div className="aspect-square w-40 h-40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden bg-muted/20 flex items-center justify-center">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentTrack?.name || "Album Art"}
                className="h-full w-full object-cover"
              />
            ) : (
              <Music2 className="h-16 w-16 text-muted-foreground/30" />
            )}
          </div>

          {/* Lyrics Panel (Mobile) - Fixed Height */}
          <div className="w-full h-80">
            <LyricsPanel track={currentTrack} currentTime={currentTime} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
