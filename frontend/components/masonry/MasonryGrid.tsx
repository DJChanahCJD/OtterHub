"use client";

import { useCallback, useEffect, useState } from "react";
import { Masonry } from "masonic";
import { MasonryImageCard } from "@/components/masonry/MasonryImageCard";
import { FileItem } from "@/lib/types";

interface MasonryGridProps {
  files: FileItem[];
  columnGutter?: number;
  overscanBy?: number;
}

const RESPONSIVE_COLUMN_WIDTHS = {
  mobile: 180, // < 640px
  tablet: 240, // 640px - 1024px
  desktop: 300, // > 1024px
} as const;

export function MasonryGrid({
  files,
  columnGutter = 16,
  overscanBy = 4,
}: MasonryGridProps) {
  const [columnWidth, setColumnWidth] = useState<number>(
    RESPONSIVE_COLUMN_WIDTHS.desktop,
  );

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setColumnWidth(RESPONSIVE_COLUMN_WIDTHS.mobile);
      else if (w < 1024) setColumnWidth(RESPONSIVE_COLUMN_WIDTHS.tablet);
      else setColumnWidth(RESPONSIVE_COLUMN_WIDTHS.desktop);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const renderCard = useCallback(
    ({ data }: { data: FileItem }) => <MasonryImageCard file={data} />,
    [],
  );

  // 使用文件数量作为 key 的一部分，确保列表缩短时 Masonic 能重置缓存避免崩溃
  // 同时结合第一个文件的名称，增加列表内容变化时的识别度
  const gridKey = files.length > 0 ? `${files.length}-${files[0].name}` : "empty";

  return (
    <Masonry
      key={gridKey}
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
