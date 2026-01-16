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
import { useFileStore } from "@/lib/file-store";
import { FileType } from "@/lib/types";
import { TrashFileCard } from "@/components/trash-file-card";
import { deleteFile, restoreFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function TrashSheet() {
  const { buckets, fetchBucket, selectedKeys, deleteFilesLocal, clearSelection, toggleSelection } = useFileStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const { toast } = useToast();
  
  const trashBucket = buckets[FileType.Trash];
  const isEmpty = trashBucket.items.length === 0;
  const selectedTrashKeys = selectedKeys[FileType.Trash] || [];
  const hasSelection = selectedTrashKeys.length > 0;

  useEffect(() => {
    if (isOpen && trashBucket.items.length === 0 && trashBucket.hasMore) {
      fetchBucket(FileType.Trash);
    }
  }, [isOpen, fetchBucket, trashBucket.items.length, trashBucket.hasMore]);

  // 当 Sheet 关闭时清除选中
  useEffect(() => {
    if (!isOpen) {
        clearSelection(FileType.Trash);
    }
  }, [isOpen, clearSelection]);

  const handleLoadMore = () => {
    fetchBucket(FileType.Trash);
  };

  const handleBatchRestore = async () => {
    if (!confirm(`确定还原选中的 ${selectedTrashKeys.length} 个文件?`)) return;
    
    setIsBatchProcessing(true);
    try {
        await Promise.all(selectedTrashKeys.map(key => restoreFile(key)));
        deleteFilesLocal(selectedTrashKeys);
        clearSelection(FileType.Trash);
        
        toast({ title: `已还原 ${selectedTrashKeys.length} 个文件` });
    } catch (error) {
        toast({ title: "批量还原失败", variant: "destructive" });
    } finally {
        setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定永久删除选中的 ${selectedTrashKeys.length} 个文件? 此操作不可恢复！`)) return;

    setIsBatchProcessing(true);
    try {
        await Promise.all(selectedTrashKeys.map(key => deleteFile(key, true)));
        deleteFilesLocal(selectedTrashKeys);
        clearSelection(FileType.Trash);
        toast({ title: `已永久删除 ${selectedTrashKeys.length} 个文件` });
    } catch (error) {
        toast({ title: "批量删除失败", variant: "destructive" });
    } finally {
        setIsBatchProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-foreground hover:bg-secondary/50 hover:text-red-500 transition-colors"
          title="Recycle Bin"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l border-border">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Recycle Bin
          </SheetTitle>
          <SheetDescription className="text-sm text-foreground/80">
            Items in the trash will be permanently deleted after 30 days.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {isEmpty && !trashBucket.loading ? (
            <div className="h-full flex flex-col items-center justify-center text-foreground/80 gap-2 min-h-[300px]">
              <Trash2 className="h-12 w-12 opacity-20" />
              <p>Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-3 pb-20">
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
                    className="text-muted-foreground hover:text-foreground"
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
