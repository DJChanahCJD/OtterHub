"use client";

import { useCallback, useMemo } from "react";
import { Masonry } from "masonic";
import { MasonryImageCard } from "@/components/masonry/MasonryImageCard";
import { FileItem } from "@/lib/types";

interface VirtualMasonryGridProps {
  files: FileItem[];
  columnGutter?: number;
  overscanBy?: number;
}

const DEFAULT_COLUMN_GUTTER = 16;
const DEFAULT_OVERSCAN = 4;

// 响应式列宽配置
const RESPONSIVE_COLUMN_WIDTHS = {
  mobile: 180, // < 640px
  tablet: 240, // 640px - 1024px
  desktop: 300, // > 1024px
} as const;

export function MasonryGrid({
  files,
  columnGutter = DEFAULT_COLUMN_GUTTER,
  overscanBy = DEFAULT_OVERSCAN,
}: VirtualMasonryGridProps) {
  // 动态计算响应式列宽
  const columnWidth = useMemo(() => {
    // 服务端渲染时使用默认值
    if (typeof window === "undefined") return RESPONSIVE_COLUMN_WIDTHS.desktop;

    const width = window.innerWidth;
    if (width < 640) return RESPONSIVE_COLUMN_WIDTHS.mobile;
    if (width < 1024) return RESPONSIVE_COLUMN_WIDTHS.tablet;
    return RESPONSIVE_COLUMN_WIDTHS.desktop;
  }, []);

  const renderCard = useCallback(
    (data: { index: number; width: number; data: FileItem; key: string }) => {
      return <MasonryImageCard file={data.data} />;
    },
    [],
  );

  return (
    <Masonry
      items={files}
      render={renderCard}
      columnWidth={columnWidth}
      columnGutter={columnGutter}
      overscanBy={overscanBy}
      maxColumnWidth={400}
      itemHeightEstimate={300}
    />
  );
}
