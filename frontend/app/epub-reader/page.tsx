"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ReactReader = dynamic(() => import("react-reader").then((mod) => mod.ReactReader), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      正在加载阅读器资源...
    </div>
  ),
});

const EPUB_OPTIONS = {
  flow: "scrolled",
  manager: "continuous",
  openAs: "epub",
} as const;

function EpubReaderContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const title = searchParams.get("title");
  
  const [location, setLocation] = useState<string | number | null>(null);
  const [rendition, setRendition] = useState<any>(null);

  // URL 变化时重置阅读位置
  useEffect(() => {
    setLocation(null);
  }, [url]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        无效的文件链接
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between bg-background z-10">
         <h1 className="text-lg font-semibold truncate pr-8">{title || "阅读器"}</h1>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        <ReactReader
          url={url}
          location={location}
          locationChanged={setLocation}
          epubOptions={EPUB_OPTIONS}
          getRendition={setRendition}
        />
      </div>
    </div>
  );
}

export default function EpubReaderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">加载中...</div>}>
      <EpubReaderContent />
    </Suspense>
  );
}
