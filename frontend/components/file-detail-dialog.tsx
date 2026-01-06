"use client";

import { FileItem } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize, formatTime } from "@/lib/utils";
import { Clock, File, Heart, HeartOff, Code, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  if (!file) return null;

  const jsonString = JSON.stringify(file, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast({
      title: "JSON 已复制到剪贴板",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d2137] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">文件详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <File className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60 mb-1">文件名</p>
              <p className="text-sm font-medium text-white break-all">
                {file.metadata.fileName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <File className="h-5 w-5 text-purple-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60 mb-1">文件大小</p>
              <p className="text-sm font-medium text-white">
                {formatFileSize(file.metadata.fileSize)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60 mb-1">上传时间</p>
              <p className="text-sm font-medium text-white">
                {formatTime(file.metadata.uploadedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            {file.metadata.liked ? (
              <Heart className="h-5 w-5 text-pink-400 mt-0.5 shrink-0 fill-pink-400" />
            ) : (
              <HeartOff className="h-5 w-5 text-white/40 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60 mb-1">收藏状态</p>
              <p
                className={`text-sm font-medium ${
                  file.metadata.liked ? "text-pink-400" : "text-white/60"
                }`}
              >
                {file.metadata.liked ? "已收藏" : "未收藏"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-teal-400" />
              <p className="text-sm font-medium text-white">JSON 数据</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyJson}
              className="text-white/80 hover:text-white hover:bg-white/10 gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <div className="bg-black/30 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-all">
              {jsonString}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
