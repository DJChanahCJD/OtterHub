"use client"

import { useFileStore, useFilteredFiles } from "@/lib/file-store"
import { FileCard } from "@/components/file-card"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { SortTypeDropdown } from "@/components/sort-type-dropdown"
import { FileType, ViewMode, SortType, SortOrder } from "@/lib/types"
import { useEffect } from "react"
import { getFromStorage } from "@/lib/local-storage"
import { STORAGE_KEYS } from "@/lib/local-storage"

export function FileGrid() {
  const activeType = useFileStore((state) => state.activeType)
  const viewMode = useFileStore((state) => state.viewMode)
  const setViewMode = useFileStore((state) => state.setViewMode)
  const setSortType = useFileStore((state) => state.setSortType)
  const setSortOrder = useFileStore((state) => state.setSortOrder)
  const filteredFiles = useFilteredFiles()

  useEffect(() => {
    setViewMode(getFromStorage(STORAGE_KEYS.VIEW_MODE, ViewMode.Grid));
    setSortType(getFromStorage(STORAGE_KEYS.SORT_TYPE, SortType.UploadedAt));
    setSortOrder(getFromStorage(STORAGE_KEYS.SORT_ORDER, SortOrder.Desc));
  }, [setViewMode, setSortType, setSortOrder]);


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/60">
          {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
        </div>
        <div className="flex items-center gap-2">
          <SortTypeDropdown />
          <ViewModeToggle />
        </div>
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
