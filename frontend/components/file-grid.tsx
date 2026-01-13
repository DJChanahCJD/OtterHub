"use client";
import { useState } from "react";
import {
  useFileStore,
  useFilteredFiles,
  useActiveBucket,
} from "@/lib/file-store";
import { FileCard } from "@/components/file-card";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { SortTypeDropdown } from "@/components/sort-type-dropdown";
import { PaginationWithLoadMore } from "@/components/pagination/pagination-with-load-more";
import { ViewMode } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { useInitFileStore } from "@/hooks/use-init-file-store";
import { VirtualMasonryGrid } from "./masonry/virtual-masonry-grid";

function FileListRenderer({
  viewMode,
  files,
}: {
  viewMode: ViewMode;
  files: any[];
}) {
  if (viewMode === ViewMode.Grid) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <FileCard key={file.name} file={file} />
        ))}
      </div>
    );
  }

  if (viewMode === ViewMode.Masonry) {
    return (
      <div className="w-full min-w-0">
        <VirtualMasonryGrid files={files} />
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

export function FileGrid() {
  useInitFileStore();

  const viewMode = useFileStore((s) => s.viewMode);
  const fetchNextPage = useFileStore((s) => s.fetchNextPage);
  const files = useFilteredFiles();
  const bucket = useActiveBucket();

  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/60">{files.length} 个文件</div>
        <div className="flex items-center gap-2">
          <SortTypeDropdown />
          <ViewModeToggle />
        </div>
      </div>

      <FileListRenderer viewMode={viewMode} files={currentFiles} />

      {viewMode !== ViewMode.Masonry && (
        <PaginationWithLoadMore
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
            className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
