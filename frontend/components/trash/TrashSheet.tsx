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
import { processBatch } from "@/lib/utils";

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
  const { selectedKeys, clearSelection } = useFileUIStore();
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
    const toastId = toast.loading(
      `正在还原 ${selectedTrashKeys.length} 个文件...`,
    );

    try {
      const selectedItems = trashBucket.items.filter((item) =>
        selectedTrashKeys.includes(item.name),
      );

      await processBatch(
        selectedItems,
        async (item) => {
          await restoreFile(item.name);
          restoreFromTrashLocal(item);
        },
        (current, total) => {
          toast.loading(`正在还原 ${current}/${total} 个文件...`, {
            id: toastId,
          });
        },
        10,
      );

      clearSelection(FileType.Trash);

      toast.success(`已还原 ${selectedTrashKeys.length} 个文件`, {
        id: toastId,
      });
    } catch (error) {
      toast.error("批量还原失败", { id: toastId });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (
      !confirm(
        `确定永久删除选中的 ${selectedTrashKeys.length} 个文件? 此操作不可恢复！`,
      )
    )
      return;

    setIsBatchProcessing(true);
    const toastId = toast.loading(
      `正在删除 ${selectedTrashKeys.length} 个文件...`,
    );

    try {
      const selectedItems = trashBucket.items.filter((item) =>
        selectedTrashKeys.includes(item.name),
      );

      await processBatch(
        selectedItems,
        async (item) => {
          await deleteFile(item.name);
          deleteFilesLocalByType([item.name], FileType.Trash);
        },
        (current, total) => {
          toast.loading(`正在删除 ${current}/${total} 个文件...`, {
            id: toastId,
          });
        },
        10,
      );

      clearSelection(FileType.Trash);
      toast.success(`已永久删除 ${selectedTrashKeys.length} 个文件`, {
        id: toastId,
      });
    } catch (error) {
      toast.error("批量删除失败", { id: toastId });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (isEmpty) return;
    if (!confirm("确定清空回收站吗？所有文件将被永久删除且无法恢复！")) return;

    setIsBatchProcessing(true);
    const toastId = toast.loading("正在清空回收站...");

    try {
      // 注意：这里只删除当前已加载的 items。如果后端没有清空接口，只能这样处理。
      // 如果 items 非常多，建议后端增加 Empty Trash 接口。
      const itemsToDelete = [...trashBucket.items];

      await processBatch(
        itemsToDelete,
        async (item) => {
          await deleteFile(item.name);
          deleteFilesLocalByType([item.name], FileType.Trash);
        },
        (current, total) => {
          toast.loading(`正在删除 ${current}/${total} 个文件...`, {
            id: toastId,
          });
        },
        10,
      );

      toast.success("回收站已清空", { id: toastId });
    } catch (error) {
      toast.error("清空回收站失败", { id: toastId });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l border-border">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            回收站
          </SheetTitle>
          <SheetDescription className="text-sm text-foreground/80">
            文件将于 30 天后永久删除。{" "}
            {!isEmpty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmptyTrash}
                disabled={isBatchProcessing}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                清空回收站
              </Button>
            )}
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
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={isBatchProcessing}
                className="gap-1"
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
