"use client"

import { useBucketItems, useFileStore } from "@/lib/file-store"
import { FileCard } from "@/components/file-card"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { AudioPlayerView } from "@/components/audio-player-view"
import { FileType, ViewMode } from "@/lib/types"

export function FileGrid() {
  const activeType = useFileStore((state) => state.activeType)
  const viewMode = useFileStore((state) => state.viewMode)

  const filteredFiles = useBucketItems(activeType)

  if (activeType === FileType.Audio) {
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

      {viewMode === ViewMode.Grid ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <FileCard key={file.name} file={file} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <FileCard key={file.name} file={file} listView />
          ))}
        </div>
      )}
    </div>
  )
}
