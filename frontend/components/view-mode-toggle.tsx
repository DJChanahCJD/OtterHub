"use client"

import { Grid3x3, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function ViewModeToggle() {
  const viewMode = useFileStore((state) => state.viewMode)
  const setViewMode = useFileStore((state) => state.setViewMode)

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("grid")}
        className={cn(
          "h-8 px-3",
          viewMode === "grid"
            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10",
        )}
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("list")}
        className={cn(
          "h-8 px-3",
          viewMode === "list"
            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10",
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
