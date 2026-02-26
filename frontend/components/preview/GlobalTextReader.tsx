"use client";

import { useEffect, useState } from "react";
import { usePreviewStore } from "@/stores/preview-store";
import { getFileUrl } from "@/lib/api";
import { downloadFile } from "@/lib/utils";
import { Copy, CopyCheck, Download, Minus, X, FileText, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function GlobalTextReader({ position = "top-[60%]" }: { position?: string }) {
  const { text, minimize, maximize, close } = usePreviewStore();
  const activeFile = text?.file;
  const viewState = text?.viewState;

  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeFile) {
      setContent("");
      setError(null);
      setCopied(false);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = getFileUrl(activeFile.name);
        const res = await fetch(url);
        if (!res.ok) throw new Error("加载文件失败");
        const text = await res.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [activeFile]);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("复制失败");
    }
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const url = getFileUrl(activeFile.name);
    downloadFile(url, activeFile.metadata);
  };

  if (!activeFile) return null;

  return (
    <>
      {/* FULL VIEW OVERLAY */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300",
          viewState === "full" 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none scale-95"
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) minimize('text');
        }}
      >
        <div className="relative w-[90vw] h-[80vh] max-w-4xl bg-background rounded-xl shadow-2xl flex flex-col overflow-hidden border m-4">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-secondary/10">
            <h3 className="font-semibold truncate pr-4 max-w-[60%]">
              {activeFile.metadata?.fileName || "文本查看器"}
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => minimize('text')} title="最小化">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => close('text')} title="关闭">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full overflow-hidden flex flex-col relative bg-background group">
            {content && !loading && !error && (
              <div className="absolute top-4 right-6 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm transition-colors"
                  onClick={handleCopy}
                  title="复制内容"
                >
                  {copied ? (
                    <CopyCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm transition-colors"
                  onClick={handleDownload}
                  title="下载文件"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex-1 w-full overflow-auto p-6 scrollbar-thin scrollbar-thumb-secondary">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <span className="animate-pulse">加载中...</span>
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center text-destructive">
                  {error}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed max-w-none text-foreground/90">
                  {content}
                </pre>
              )}
            </div>
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
          className="relative flex items-center justify-center bg-background/80 backdrop-blur-md border border-r-0 border-border shadow-md rounded-l-full w-11 h-9 cursor-pointer"
          onClick={() => maximize('text')}
        >
           {/* Main Icon */}
           <div className="z-10 text-primary">
              <FileText className="w-5 h-5" />
           </div>

           {/* Close Button (Bottom Left) */}
           <div className="absolute -bottom-2 -left-2 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100 z-20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full bg-gray-500/80 hover:bg-destructive text-white shadow-sm p-0.5"
                onClick={(e) => { e.stopPropagation(); close('text'); }}
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
