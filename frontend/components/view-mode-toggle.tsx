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
    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
      {activeType === FileType.Image && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode(ViewMode.Masonry)}
          className={cn(
            "h-8 px-3",
            viewMode === ViewMode.Masonry
              ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              : "text-white/60 hover:text-white hover:bg-white/10",
          )}
        >
          <LayoutTemplate className="h-4 w-4" />
        </Button>
      )}
      {activeType === FileType.Audio && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openExternalLink(FREE_MUSIC_URL)}
          title="GD Studio's Online Music Platform"
          className={cn(
            "h-8 px-3 text-white/60 hover:text-white hover:bg-white/10",
          )}
        >
          <Music className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode(ViewMode.Grid)}
        className={cn(
          "h-8 px-3",
          viewMode === ViewMode.Grid
            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10",
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
            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10",
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
