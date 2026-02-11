"use client";

import { FileItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize, formatTime } from "@/lib/utils";
import { Clock, File, Code, Copy, Check, Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileTagBadge } from "@/components/FileTagBadge";
import { toast } from "sonner";

interface FileDetailDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileDetailDialog({
  file,
  open,
  onOpenChange,
}: FileDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const jsonString = JSON.stringify(file, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("JSON 已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-glass-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">文件详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <File className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/60 mb-1">文件名</p>
              <p className="text-sm font-medium text-foreground break-all">
                {file.metadata?.fileName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <File className="h-5 w-5 text-purple-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/60 mb-1">文件大小</p>
              <p className="text-sm font-medium text-foreground">
                {formatFileSize(file.metadata?.fileSize ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/60 mb-1">上传时间</p>
              <p className="text-sm font-medium text-foreground">
                {formatTime(file.metadata?.uploadedAt)}
              </p>
            </div>
          </div>

          {file.metadata.tags && file.metadata.tags.length > 0 && (
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/60 mb-1">标签</p>
                <div className="flex flex-wrap gap-2">
                  {file.metadata.tags.map((tag) => (
                    <FileTagBadge key={tag} tag={tag} showIcon />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-glass-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-teal-400" />
              <p className="text-sm font-medium text-foreground">JSON 数据</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyJson}
              className="text-foreground/80 hover:text-foreground hover:bg-secondary/50 gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4 overflow-x-auto overflow-y-auto max-h-80 border border-glass-border">
            <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap break-all">
              {jsonString}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
