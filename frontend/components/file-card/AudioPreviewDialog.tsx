"use client";

import { FileItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFileUrl } from "@/lib/api";

interface AudioPreviewDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 音频预览弹窗组件
 * 用于展示音频文件的在线预览
 */
export function AudioPreviewDialog({
  file,
  open,
  onOpenChange,
}: AudioPreviewDialogProps) {
  if (!file) return null;

  const url = getFileUrl(file.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 bg-black border-none overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-4 bg-linear-to-b from-black/80 to-transparent pointer-events-none">
          <DialogTitle className="text-white text-sm font-medium truncate pr-8 text-center">
            {file.metadata?.fileName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="w-full flex items-center justify-center p-8 pb-12 bg-black">
          <audio
            src={url}
            controls
            autoPlay
            className="w-full outline-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
