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
        "fixed inset-0 z-[49] bg-transparent transition-transform duration-500 ease-in-out flex flex-col dark",
        isFullScreen ? "translate-y-0" : "translate-y-[100%]"
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
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-slate-900 to-black" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row p-8 pb-24 gap-8 overflow-hidden relative z-10">
        {/* Left: Big Album Art */}
        <div className="flex-1 flex items-center justify-center p-8 min-h-0">
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

        {/* Right: Lyrics + Info */}
        <div className="flex-1 h-full min-h-0">
          <LyricsPanel track={currentTrack} currentTime={currentTime} />
        </div>
      </div>
    </div>,
    document.body
  );
}
