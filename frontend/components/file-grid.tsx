"use client";
import { useState } from "react";
import {
  useFileStore,
  useFilteredFiles,
  useActiveBucket,
} from "@/lib/file-store";
import { FileCard } from "@/components/file-card";
import { MasonryImageCard } from "@/components/masonry-image-card";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { SortTypeDropdown } from "@/components/sort-type-dropdown";
import { PaginationWithLoadMore } from "@/components/pagination/pagination-with-load-more";
import { VirtualMasonryGrid } from "@/components/virtual-masonry-grid";
import { ViewMode } from "@/lib/types";
import { PhotoProvider } from "react-photo-view";
import { ZoomIn, ZoomOut, RotateCw, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { useInitFileStore } from "@/hooks/use-init-file-store";

function PhotoToolbar({ rotate, onRotate, scale, onScale }: any) {
  return (
    <div className="flex items-center gap-1">
      <ToolbarButton onClick={() => onScale(scale + 0.2)}>
        <ZoomIn className="h-5 w-5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onScale(scale - 0.2)}>
        <ZoomOut className="h-5 w-5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onRotate(rotate + 90)}>
        <RotateCw className="h-5 w-5" />
      </ToolbarButton>
    </div>
  );
}

// 通用工具栏按钮组件
function ToolbarButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="
        text-white/80
        hover:text-white
        hover:bg-white/10
        backdrop-blur-sm
      "
    >
      {children}
    </Button>
  );
}

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
    return <VirtualMasonryGrid files={files} />;
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
    <PhotoProvider
      maskOpacity={0.85}
      toolbarRender={(props) => <PhotoToolbar {...props} />}
    >
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
    </PhotoProvider>
  );
}
