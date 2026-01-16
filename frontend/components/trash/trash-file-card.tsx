"use client";

import { useState, useMemo } from "react";
import { RefreshCcw, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileStore } from "@/lib/file-store";
import { FileItem, FileType, trashPrefix } from "@/lib/types";
import { getFileTypeFromKey, cn } from "@/lib/utils";
import { FileContent } from "@/components/file-card";
import { deleteFile, getTrashFileUrl, restoreFile } from "@/lib/api";
import { toast } from "sonner";

interface TrashFileCardProps {
  file: FileItem;
}

export function TrashFileCard({ file }: TrashFileCardProps) {
  const { 
    imageLoadMode, 
    toggleSelection, 
    selectedKeys,
    restoreFromTrashLocal,
    deleteFilesLocalByType,
  } = useFileStore();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileType = useMemo(() => {
    const realKey = file.name.startsWith(trashPrefix) 
      ? file.name.slice(trashPrefix.length) 
      : file.name;
    return getFileTypeFromKey(realKey);
  }, [file.name]);
  const isSelected = selectedKeys[FileType.Trash]?.includes(file.name);

  const remainingText = useMemo(() => {
    const exp = file.expiration;
    if (!exp) return "N/A";
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) return "Expired";
    
    const dayMs = 24 * 60 * 60 * 1000;
    const hourMs = 60 * 60 * 1000;
    const days = Math.floor(ms / dayMs);
    const hours = Math.floor((ms % dayMs) / hourMs);
    return `剩余 ${days}天${hours}小时`;
  }, [file.expiration]);

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsRestoring(true);
    try {
      await restoreFile(file.name).then(() => {
        restoreFromTrashLocal(file);
      });
      toast.success("恢复成功");
    } catch (error) {
      toast.error("恢复失败")
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeletePermanently = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定永久删除 ${file.metadata.fileName} ? 此操作不可恢复！`)) return;

    setIsDeleting(true);
    try {
      await deleteFile(file.name).then(() => {
        deleteFilesLocalByType([file.name], fileType);
      });
      toast.success("删除成功");
    } catch (error) {
      toast.error("删除失败");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(file.name, FileType.Trash);
  };

  const TextColor = "text-foreground/80";

  return (
    <div 
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
        isSelected 
          ? "bg-primary/10 border-primary/50" 
          : "bg-background/50 border-border/50 hover:bg-secondary/30 hover:border-border"
      )}
      onClick={handleSelect}
    >
      {/* Preview */}
      <div className="shrink-0 w-12 h-12 rounded-lg bg-secondary/30 overflow-hidden relative flex items-center justify-center">
         <FileContent
            fileType={fileType}
            fileKey={file.name}
            safeMode={false}
            canPreview={false}
            fileSize={file.metadata.fileSize}
            loadImageMode={imageLoadMode}
            thumbUrl={file.metadata.thumbUrl}
            imgSrc={getTrashFileUrl(file.name)}
          />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${TextColor}`}>
            {file.metadata.fileName}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-xs ${TextColor}`}>{remainingText}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-green-500 hover:bg-green-500/50`}
          onClick={handleRestore}
          disabled={isRestoring || isDeleting}
          title="还原"
        >
          {isRestoring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-red-500 hover:bg-red-500/50`}
          onClick={handleDeletePermanently}
          disabled={isRestoring || isDeleting}
          title="永久删除"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
