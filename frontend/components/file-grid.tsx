"use client"

import { useFileStore, useFilteredFiles } from "@/lib/file-store"
import { FileCard } from "@/components/file-card"
import { MasonryImageCard } from "@/components/masonry-image-card"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { SortTypeDropdown } from "@/components/sort-type-dropdown"
import { FileType, ViewMode, SortType, SortOrder, BrowseMode } from "@/lib/types"
import { useEffect } from "react"
import { getFromStorage } from "@/lib/local-storage"
import { STORAGE_KEYS } from "@/lib/local-storage"
import { PhotoProvider } from "react-photo-view"

export function FileGrid() {
  const activeType = useFileStore((state) => state.activeType)
  const viewMode = useFileStore((state) => state.viewMode)
  const setViewMode = useFileStore((state) => state.setViewMode)
  const setSortType = useFileStore((state) => state.setSortType)
  const setSortOrder = useFileStore((state) => state.setSortOrder)
  const setSafeMode = useFileStore((state) => state.setSafeMode)
  const setBrowseMode = useFileStore((state) => state.setBrowseMode)
  const filteredFiles = useFilteredFiles()

  useEffect(() => {
    setViewMode(getFromStorage(STORAGE_KEYS.VIEW_MODE, ViewMode.Grid));
    setSortType(getFromStorage(STORAGE_KEYS.SORT_TYPE, SortType.UploadedAt));
    setSortOrder(getFromStorage(STORAGE_KEYS.SORT_ORDER, SortOrder.Desc));
    setSafeMode(getFromStorage(STORAGE_KEYS.SAFE_MODE, true));
    setBrowseMode(getFromStorage(STORAGE_KEYS.BROWSE_MODE, BrowseMode.SmartNoImage));
  }, [setViewMode, setSortType, setSortOrder, setSafeMode]);

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
      ) : viewMode === ViewMode.Masonry ? (
        <PhotoProvider maskOpacity={0.85}>
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {filteredFiles.map((file) => (
              <div key={file.name} className="break-inside-avoid">
                <MasonryImageCard file={file} />
              </div>
            ))}
          </div>
        </PhotoProvider>
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
