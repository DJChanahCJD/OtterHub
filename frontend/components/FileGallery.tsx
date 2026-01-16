"use client";

import { useState } from "react";
import {
  useFileStore,
  useFilteredFiles,
  useActiveBucket,
} from "@/lib/file-store";
import { FileCard } from "@/components/file-card";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { SortTypeDropdown } from "@/components/SortTypeDropdown";
import { Pagination } from "@/components/Pagination";
import { ViewMode } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { useInitFileStore } from "@/hooks/use-init-file-store";
import { MasonryGrid } from "./masonry/MasonryGrid";
import { PhotoProvider } from "react-photo-view";
import { PhotoToolbar } from "./FileImagePreview";

function FileViewRenderer({
  viewMode,
  files,
}: {
  viewMode: ViewMode;
  files: any[];
}) {
  if (viewMode === ViewMode.Grid) {
    return (
      // 100%缩放时每行5个文件
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        {files.map((file) => (
          <FileCard key={file.name} file={file} />
        ))}
      </div>
    );
  }

  if (viewMode === ViewMode.Masonry) {
    return (
      <div className="w-full min-w-0">
        <MasonryGrid files={files} />
      </div>
    );
  }

  // 列表模式
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <FileCard key={file.name} file={file} listView />
      ))}
    </div>
  );
}

export function FileGallery() {
  useInitFileStore();

  const viewMode = useFileStore((s) => s.viewMode);
  const fetchNextPage = useFileStore((s) => s.fetchNextPage);
  const itemsPerPage = useFileStore((s) => s.itemsPerPage);
  const setItemsPerPage = useFileStore((s) => s.setItemsPerPage);
  const files = useFilteredFiles();
  const bucket = useActiveBucket();

  const [currentPage, setCurrentPage] = useState(0);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setCurrentPage(selectedItem.selected);
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(0);
  };

  const offset = currentPage * itemsPerPage;
  const currentFiles =
    viewMode === ViewMode.Masonry
      ? files
      : files.slice(offset, offset + itemsPerPage);

  return (
    <PhotoProvider
      maskOpacity={0.85}
      toolbarRender={(props) => <PhotoToolbar {...props} />}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-foreground/50">{files.length} 个文件</div>
        <div className="flex items-center gap-2">
          <SortTypeDropdown />
          <ViewModeToggle />
        </div>
      </div>

      <FileViewRenderer viewMode={viewMode} files={currentFiles} />

      {viewMode !== ViewMode.Masonry && (
        <Pagination
          totalItems={files.length}
          itemsPerPage={itemsPerPage}
          hasMore={bucket.hasMore}
          loading={bucket.loading}
          onPageChange={handlePageChange}
          onLoadMore={fetchNextPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {viewMode === ViewMode.Masonry && bucket.hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={fetchNextPage}
            disabled={bucket.loading}
            className="px-6 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </PhotoProvider>
  );
}
