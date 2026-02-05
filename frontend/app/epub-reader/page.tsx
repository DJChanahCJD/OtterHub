"use client";

import Script from "next/script";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

  // react-reader runtime
  const [reader, setReader] = useState<{
    Component: any;
    baseStyle: any;
  } | null>(null);

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
      <Script
        src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"
        strategy="lazyOnload"
        onLoad={async () => {
          try {
            const mod = await import("react-reader");
            setReader({
              Component: mod.ReactReader,
              baseStyle: mod.ReactReaderStyle,
            });
          } catch (err) {
            console.error("Failed to load react-reader", err);
          }
        }}
      />
      
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between bg-background z-10">
         <h1 className="text-lg font-semibold truncate pr-8">{title || "阅读器"}</h1>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        {reader ? (
          <reader.Component
            url={url}
            location={location}
            locationChanged={setLocation}
            epubOptions={EPUB_OPTIONS}
            getRendition={setRendition}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            正在加载阅读器资源...
          </div>
        )}
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
