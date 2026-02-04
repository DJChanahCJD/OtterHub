"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MusicTrack } from "@shared/types";

interface PlayerQueuePopoverProps {
  queue: MusicTrack[];
  currentIndex: number;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onClear: () => void;
  trigger: React.ReactNode;
}

export function PlayerQueuePopover({
  queue,
  currentIndex,
  isPlaying,
  onPlay,
  onClear,
  trigger,
}: PlayerQueuePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-80 p-0 h-96 flex flex-col"
      >
        <div className="p-3 border-b text-sm font-medium flex justify-between items-center">
          <span>播放列表 ({queue.length})</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 text-muted-foreground hover:bg-transparent hover:text-destructive"
            onClick={onClear}
            title="清空播放列表"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-1">
              {queue.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-muted/50",
                    i === currentIndex && "bg-muted/50 text-primary",
                  )}
                  onClick={() => onPlay(i)}
                >
                  {i === currentIndex && isPlaying ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="animate-spin text-primary">💿</span>
                    </div>
                  ) : (
                    <span className="w-4 text-center text-xs text-muted-foreground font-mono">
                      {i + 1}
                    </span>
                  )}
                  <div className="flex-1 min-w-0 truncate">
                    <span className="font-medium">{track.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {" "}
                      - {track.artist.join("/")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
