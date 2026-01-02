"use client"

import { useFileStore } from "@/lib/store"
import { FileCard } from "@/components/file-card"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { AudioPlayerView } from "@/components/audio-player-view"

export function FileGrid() {
  const files = useFileStore((state) => state.files)
  const activeFilter = useFileStore((state) => state.activeFilter)
  const viewMode = useFileStore((state) => state.viewMode)

  const filteredFiles = activeFilter === "all" ? files : files.filter((f) => f.type === activeFilter)

  if (activeFilter === "audio") {
    return <AudioPlayerView />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/60">
          {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
        </div>
        <ViewModeToggle />
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} listView />
          ))}
        </div>
      )}
    </div>
  )
}
