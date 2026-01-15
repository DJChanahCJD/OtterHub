"use client"

import { Grid3x3, LayoutTemplate, List, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileStore } from "@/lib/file-store"
import { cn } from "@/lib/utils"
import { FileType, ViewMode } from "@/lib/types"
import { openExternalLink } from "@/lib/utils"
import { FREE_MUSIC_URL } from "@/lib/music-api"

export function ViewModeToggle() {
  const viewMode = useFileStore((state) => state.viewMode)
  const setViewMode = useFileStore((state) => state.setViewMode)
  const activeType = useFileStore((state) => state.activeType)

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-glass-bg border border-glass-border">
      {activeType === FileType.Image && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode(ViewMode.Masonry)}
          className={cn(
            "h-8 px-3",
            viewMode === ViewMode.Masonry
              ? "bg-primary/20 text-primary hover:bg-primary/30"
              : "text-foreground/60 hover:text-foreground hover:bg-secondary/50",
          )}
        >
          <LayoutTemplate className="h-4 w-4" />
        </Button>
      )}
      {/* TODO: 实现音频播放列表功能 */}
      {/* {activeType === FileType.Audio && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openExternalLink(FREE_MUSIC_URL)}
          title="GD Studio's Online Music Platform"
          className={cn(
            "h-8 px-3 text-foreground/60 hover:text-foreground hover:bg-secondary/50",
          )}
        >
          <Music className="h-4 w-4" />
        </Button>
      )} */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode(ViewMode.Grid)}
        className={cn(
          "h-8 px-3",
          viewMode === ViewMode.Grid
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "text-foreground/60 hover:text-foreground hover:bg-secondary/50",
        )}
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode(ViewMode.List)}
        className={cn(
          "h-8 px-3",
          viewMode === ViewMode.List
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "text-foreground/60 hover:text-foreground hover:bg-secondary/50",
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
