"use client";

import { FileItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFileUrl } from "@/lib/api";

interface VideoPreviewDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 视频预览弹窗组件
 * 用于展示视频文件的在线预览
 */
export function VideoPreviewDialog({
  file,
  open,
  onOpenChange,
}: VideoPreviewDialogProps) {
  if (!file) return null;

  const url = getFileUrl(file.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] p-0 bg-black border-none overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-50 bg-linear-to-b from-black/80 to-transparent pointer-events-none">
          <DialogTitle className="text-white text-sm font-medium truncate pr-8">
            {file.metadata.fileName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="aspect-video w-full flex items-center justify-center">
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain outline-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
