"use client";

import * as React from "react";
import { cn, formatMediaTime } from "@/lib/utils";

interface PlayerProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (value: number[]) => void;
  className?: string;
}

export function PlayerProgressBar({
  currentTime,
  duration,
  onSeek,
  className,
}: PlayerProgressBarProps) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const getPercent = (clientX: number) => {
    if (!barRef.current) return 0;
    const { left, width } = barRef.current.getBoundingClientRect();
    return Math.min(Math.max((clientX - left) / width, 0), 1);
  };

  return (
    <div
      ref={barRef}
      className={cn(
        "group absolute -top-1 w-full h-0.75 hover:h-2 cursor-pointer select-none transition-all flex items-center z-10",
        className
      )}
      onMouseMove={(e) => {
        const p = getPercent(e.clientX);
        setHoverTime(p * duration);
      }}
      onMouseLeave={() => setHoverTime(null)}
      onClick={(e) => {
        const p = getPercent(e.clientX);
        onSeek([p * duration]);
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30 group-hover:bg-muted/50 transition-colors" />

      {/* Progress */}
      <div
        className="absolute inset-y-0 left-0 bg-primary transition-all"
        style={{ width: `${progress}%` }}
      />

      {/* Tooltip */}
      {hoverTime !== null && (
        <div
          className="absolute -top-8 -translate-x-1/2 bg-background border shadow-sm text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ left: `${(hoverTime / duration) * 100}%` }}
        >
          {formatMediaTime(hoverTime)} / {formatMediaTime(duration)}
        </div>
      )}

      {/* Handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${progress}% - 6px)` }}
      />
    </div>
  );
}
