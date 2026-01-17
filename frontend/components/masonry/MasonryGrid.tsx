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
