"use client";

import { useEffect, useState } from "react";
import { FileItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFileUrl } from "@/lib/api";
import { Copy, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TextReaderDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 文本/Markdown 阅读器弹窗组件
 */
export function TextReaderDialog({
  file,
  open,
  onOpenChange,
}: TextReaderDialogProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !file) {
      setContent("");
      setError(null);
      setCopied(false);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = getFileUrl(file.name);
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
  }, [open, file]);

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

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="truncate pr-8">
            {file.metadata.fileName || "文本查看器"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 w-full overflow-hidden flex flex-col relative bg-background group">
          {content && !loading && !error && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-6 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm transition-colors"
              onClick={handleCopy}
              title="复制内容"
            >
              {copied ? (
                <CopyCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}

          <div className="flex-1 w-full overflow-auto p-6">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                加载中...
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-destructive">
                {error}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed max-w-none">
                {content}
              </pre>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
