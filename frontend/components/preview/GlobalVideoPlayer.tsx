"use client";

import { useEffect, useRef } from "react";
import { usePreviewStore } from "@/stores/preview-store";
import { API_URL, getFileUrl } from "@/lib/api";
import { Minus, X, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalVideoPlayer({ position = "top-[40%]" }: { position?: string }) {
  const { video, minimize, maximize, close } = usePreviewStore();
  const activeFile = video?.file;
  const viewState = video?.viewState;
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause on minimize
  useEffect(() => {
    if (viewState === 'minimized' && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [viewState]);

  if (!activeFile) return null;

  const url = getFileUrl(activeFile.name);
  const poster =
    typeof activeFile.metadata?.thumbUrl === "string" && activeFile.metadata.thumbUrl.length > 0
      ? `${API_URL}${activeFile.metadata.thumbUrl}`
      : undefined;

  return (
    <>
      {/* FULL VIEW OVERLAY */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300",
          viewState === "full" 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none scale-95"
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) minimize('video');
        }}
      >
        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden m-4 group">
          
          {/* Header Actions (Overlay) */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-linear-to-b from-black/80 to-transparent z-10 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <h3 className="text-white font-medium truncate pr-8 pointer-events-auto max-w-[70%]">
              {activeFile.metadata?.fileName}
            </h3>
            <div className="flex gap-2 pointer-events-auto">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => minimize('video')} title="最小化">
                <Minus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => close('video')} title="关闭">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={url}
              poster={poster}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain outline-none"
            />
          </div>
        </div>
      </div>

      {/* MINIMIZED BOOKMARK (Right Side) */}
      <div
        className={cn(
          "fixed right-0 z-49 transition-all duration-300 ease-in-out group",
          position,
          viewState === "minimized" 
            ? "opacity-50 hover:opacity-100 pointer-events-auto" 
            : "translate-x-full opacity-0 pointer-events-none"
        )}
        title={activeFile.metadata?.fileName}
      >
        <div 
          className="relative flex items-center justify-center bg-black/90 backdrop-blur-md border border-r-0 border-white/10 shadow-md rounded-l-full w-11 h-9 cursor-pointer"
          onClick={() => maximize('video')}
        >
           {/* Main Icon */}
           <div className="z-10 text-white">
              <VideoIcon className="w-5 h-5" />
           </div>

           {/* Close Button (Bottom Left) */}
           <div className="absolute -bottom-2 -left-2 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100 z-20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full bg-gray-500/80 hover:bg-destructive text-white shadow-sm p-0.5"
                onClick={(e) => { e.stopPropagation(); close('video'); }}
                title="关闭"
              >
                <X className="h-3 w-3" />
              </Button>
           </div>
        </div>
      </div>
    </>
  );
}
