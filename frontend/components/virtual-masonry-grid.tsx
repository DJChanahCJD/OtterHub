"use client";

import { useCallback } from "react";
import { Masonry } from "masonic";
import { MasonryImageCard } from "@/components/masonry-image-card";
import { FileItem } from "@/lib/types";

interface VirtualMasonryGridProps {
  files: FileItem[];
  columnWidth?: number;
  columnGutter?: number;
  overscanBy?: number;
}

const DEFAULT_COLUMN_WIDTH = 300;
const DEFAULT_COLUMN_GUTTER = 16;
const DEFAULT_OVERSCAN = 2;

export function VirtualMasonryGrid({
  files,
  columnWidth = DEFAULT_COLUMN_WIDTH,
  columnGutter = DEFAULT_COLUMN_GUTTER,
  overscanBy = DEFAULT_OVERSCAN,
}: VirtualMasonryGridProps) {
  const renderCard = useCallback((data: { index: number; width: number; data: FileItem }) => {
    return (
      <MasonryImageCard
        key={data.index}
        file={data.data}
      />
    );
  }, []);

  return (
    <Masonry
      items={files}
      render={renderCard}
      columnWidth={columnWidth}
      columnGutter={columnGutter}
      overscanBy={overscanBy}
    />
  );
}
