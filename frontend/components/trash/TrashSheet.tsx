"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { FileType } from "@shared/types";
import { TrashFileCard } from "@/components/trash/TrashFileCard";
import { deleteFile, restoreFile } from "@/lib/api";
import { toast } from "sonner";
import { useFileDataStore, useFileUIStore } from "@/stores/file";

interface TrashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashSheet({ open, onOpenChange }: TrashSheetProps) {
  const { 
    buckets, 
    fetchBucket, 
    restoreFromTrashLocal,
    deleteFilesLocalByType,
  } = useFileDataStore();
  const {
    selectedKeys,
    clearSelection,
  } = useFileUIStore();
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  const trashBucket = buckets[FileType.Trash];
  const isEmpty = trashBucket.items.length === 0;
  const selectedTrashKeys = selectedKeys[FileType.Trash] || [];
  const hasSelection = selectedTrashKeys.length > 0;

  useEffect(() => {
    if (open && trashBucket.items.length === 0 && trashBucket.hasMore) {
      fetchBucket(FileType.Trash);
    }
  }, [open, fetchBucket, trashBucket.items.length, trashBucket.hasMore]);

  // 当 Sheet 关闭时清除选中
  useEffect(() => {
    if (!open) {
        clearSelection(FileType.Trash);
    }
  }, [open, clearSelection]);

  const handleLoadMore = () => {
    fetchBucket(FileType.Trash);
  };

  const handleBatchRestore = async () => {
    if (!confirm(`确定还原选中的 ${selectedTrashKeys.length} 个文件?`)) return;
    
    setIsBatchProcessing(true);
    try {
        const selectedItems = trashBucket.items.filter(item => selectedTrashKeys.includes(item.name));
        await Promise.all(selectedItems.map(item => {
          return restoreFile(item.name).then(() => {
            restoreFromTrashLocal(item);
          });
        }));
        clearSelection(FileType.Trash);
        
        toast.success(`已还原 ${selectedTrashKeys.length} 个文件`);
    } catch (error) {
        toast.error("批量还原失败");
    } finally {
        setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定永久删除选中的 ${selectedTrashKeys.length} 个文件? 此操作不可恢复！`)) return;

    setIsBatchProcessing(true);
    try {
        const selectedItems = trashBucket.items.filter(item => selectedTrashKeys.includes(item.name));
        await Promise.all(selectedItems.map(item => {
          return deleteFile(item.name).then(() => {
            deleteFilesLocalByType([item.name], FileType.Trash);
          });
        }));
        clearSelection(FileType.Trash);
        toast.success(`已永久删除 ${selectedTrashKeys.length} 个文件`);
    } catch (error) {
        toast.error("批量删除失败");
    } finally {
        setIsBatchProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l border-border">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            回收站
          </SheetTitle>
          <SheetDescription className="text-sm text-foreground/80">
            回收站中的文件将在 30 天后永久删除。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {isEmpty && !trashBucket.loading ? (
            <div className="h-full flex flex-col items-center justify-center text-foreground/80 gap-2 min-h-[300px]">
              <Trash2 className="h-12 w-12 opacity-20" />
              <p>Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trashBucket.items.map((file) => (
                <TrashFileCard key={file.name} file={file} />
              ))}
              
              {trashBucket.loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!trashBucket.loading && trashBucket.hasMore && (
                <div className="flex justify-center pt-2">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLoadMore}
                    className="text-foreground/60 hover:text-foreground"
                   >
                     Load More
                   </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Batch Operations Footer */}
        {hasSelection && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background/95 backdrop-blur-xl flex items-center justify-between animate-in slide-in-from-bottom-5">
                <div className="text-sm font-medium">
                    {selectedTrashKeys.length} selected
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchRestore}
                        disabled={isBatchProcessing}
                        className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                        {isBatchProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Restore
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchDelete}
                        disabled={isBatchProcessing}
                        className="gap-1"
                    >
                        {isBatchProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
