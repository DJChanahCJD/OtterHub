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
import { ViewMode } from "@/lib/types";
import { PhotoProvider } from "react-photo-view";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import { useInitFileStore } from "@/hooks/use-init-file-store";
import Masonry from "react-masonry-css";

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
    return (
      <Masonry
        breakpointCols={{
          default: 4,
          1280: 3,
          768: 2,
          640: 1,
        }}
        className="flex gap-4"
        columnClassName="flex-1 flex flex-col gap-4"
      >
        {files.map((file) => (
          <MasonryImageCard key={file.name} file={file} />
        ))}
      </Masonry>
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
  const currentFiles = files.slice(offset, offset + itemsPerPage);

  return (
    <PhotoProvider
      maskOpacity={0.85}
      toolbarRender={(props) => <PhotoToolbar {...props} />}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/60">
          {files.length} 个文件
        </div>
        <div className="flex items-center gap-2">
          <SortTypeDropdown />
          <ViewModeToggle />
        </div>
      </div>

      <FileListRenderer viewMode={viewMode} files={currentFiles} />

      <PaginationWithLoadMore
        totalItems={files.length}
        itemsPerPage={itemsPerPage}
        hasMore={bucket.hasMore}
        loading={bucket.loading}
        onPageChange={handlePageChange}
        onLoadMore={fetchNextPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        showPagination={viewMode !== ViewMode.Masonry}
      />
    </PhotoProvider>
  );
}
