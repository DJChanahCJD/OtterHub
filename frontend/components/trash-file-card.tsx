"use client";

import { useState, useMemo } from "react";
import { RefreshCcw, Trash2, Loader2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileStore } from "@/lib/file-store";
import { FileItem, FileType, trashPrefix } from "@/lib/types";
import { deleteFile, restoreFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getFileTypeFromKey, formatFileSize, formatTime, cn } from "@/lib/utils";
import { FileContent } from "@/components/file-card";
import { FileTagBadge } from "@/components/file-tag-badge";
import { shouldBlur } from "@/lib/file-preview";
import { getTrashFileUrl } from "@/lib/api";

interface TrashFileCardProps {
  file: FileItem;
}

export function TrashFileCard({ file }: TrashFileCardProps) {
  const { deleteFilesLocal, safeMode, imageLoadMode, toggleSelection, selectedKeys } = useFileStore();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileType = useMemo(() => {
    const realKey = file.name.startsWith(trashPrefix) 
      ? file.name.slice(trashPrefix.length) 
      : file.name;
    return getFileTypeFromKey(realKey);
  }, [file.name]);
  const isSelected = selectedKeys[FileType.Trash]?.includes(file.name);

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsRestoring(true);
    try {
      await restoreFile(file.name);
      deleteFilesLocal([file.name]);
      toast({ title: "文件已还原" });
    } catch (error) {
      toast({ 
        title: "还原失败", 
        description: (error as Error).message,
        variant: "destructive" 
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeletePermanently = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定永久删除 ${file.metadata.fileName} ? 此操作不可恢复！`)) return;

    setIsDeleting(true);
    try {
      await deleteFile(file.name, true);
      deleteFilesLocal([file.name]);
      toast({ title: "文件已永久删除" });
    } catch (error) {
      toast({ 
        title: "删除失败", 
        description: (error as Error).message,
        variant: "destructive" 
      });
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
      {/* Checkbox */}
      <div 
        className={cn(
          "shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors",
          isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30 group-hover:border-primary/50"
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>

      {/* Preview */}
      <div className="shrink-0 w-12 h-12 rounded-lg bg-secondary/30 overflow-hidden relative flex items-center justify-center">
         <FileContent
            fileType={fileType}
            fileKey={file.name}
            safeMode={false}
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
          <p className={`text-xs ${TextColor}`}>
            {formatTime(file.metadata.uploadedAt || 0)}
          </p>
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
