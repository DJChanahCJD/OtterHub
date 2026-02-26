"use client";

import { Download, Trash2, X, Toolbox, Check, Tag, Copy, FilePen } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useFileDataStore, useActiveItems, useFilteredFiles } from "@/stores/file";
import { useFileUIStore, useActiveSelectedKeys } from "@/stores/file";
import { getFileUrl, moveToTrash, deleteFile } from "@/lib/api";
import { downloadFile, processBatch } from "@/lib/utils";
import { DIRECT_DOWNLOAD_LIMIT, ViewMode } from "@/lib/types";
import { BatchEditTagsDialog } from "./BatchEditTagsDialog";
import { BatchRenameDialog } from "./BatchRenameDialog";
import { toast } from "sonner";
import { FileType } from "@shared/types";

export function BatchOperationsBar() {
  const {
    activeType,
    updateFileMetadata,
    moveToTrashLocal,
    deleteFilesLocal,
  } = useFileDataStore();
  
  const {
    clearSelection,
    selectAll,
    addSelection,
    removeSelection,
    viewMode,
    currentPage,
    itemsPerPage,
  } = useFileUIStore();

  const selectedKeys = useActiveSelectedKeys();

  const [showBatchTags, setShowBatchTags] = useState(false);
  const [showBatchRename, setShowBatchRename] = useState(false);

  const items = useActiveItems();
  const filteredFiles = useFilteredFiles();

  /** ===== 派生数据 ===== */
  // 当前页显示的文件
  const currentFiles = useMemo(() => {
    if (viewMode === ViewMode.Masonry) return filteredFiles;
    const offset = currentPage * itemsPerPage;
    return filteredFiles.slice(offset, offset + itemsPerPage);
  }, [filteredFiles, viewMode, currentPage, itemsPerPage]);

  const selectedSet = useMemo(
    () => new Set(selectedKeys),
    [selectedKeys],
  );

  const itemMap = useMemo(
    () => new Map(items.map((f) => [f.name, f])),
    [items],
  );

  const isAllSelected =
    currentFiles.length > 0 && 
    currentFiles.every(file => selectedSet.has(file.name));

  const isMediaType =
    activeType === FileType.Audio || activeType === FileType.Video;

  /** ===== 批量标签成功回调 ===== */
  const handleBatchTagSuccess = (
    updatedFiles: Array<{ name: string; tags: string[] }>,
  ) => {
    updatedFiles.forEach(({ name, tags }) => {
      const file = itemMap.get(name);
      if (!file) return;

      updateFileMetadata(name, {
        ...file.metadata,
        tags,
      });
    });
  };

  /** ===== 批量重命名成功回调 ===== */
  const handleBatchRenameSuccess = (
    updatedFiles: Array<{ name: string; fileName: string }>,
  ) => {
    updatedFiles.forEach(({ name, fileName }) => {
      const file = itemMap.get(name);
      if (!file) return;

      updateFileMetadata(name, {
        ...file.metadata,
        fileName,
      });
    });
  };

  /** ===== 批量下载 ===== */
  const handleBatchDownload = () => {
    if (selectedKeys.length === 0) return;

    const oversizedFiles: string[] = [];
    let downloadCount = 0;

    for (const key of selectedKeys) {
      const file = itemMap.get(key);
      if (!file) continue;

      const { fileSize, fileName } = file.metadata;

      if (isMediaType && fileSize > DIRECT_DOWNLOAD_LIMIT) {
        oversizedFiles.push(fileName);
        continue;
      }

      downloadFile(getFileUrl(key), file.metadata);
      downloadCount++;
    }

    if (downloadCount > 0) {
      toast.success(`正在下载 ${downloadCount} 个文件`);
    }

    if (oversizedFiles.length > 0) {
      toast.warning("部分文件未自动下载", {
        description: `${oversizedFiles.length} 个文件过大，请在新页面使用浏览器原生控件下载`,
        duration: 5000,
      });
    }
  };

  /** ===== 批量删除 ===== */
  const handleBatchDelete = async () => {
    if (!confirm(`确认删除这 ${selectedKeys.length} 个文件？`)) return;

    const toastId = toast.loading(`正在删除 ${selectedKeys.length} 个文件...`);

    try {
      const successful: string[] = [];
      const failed: string[] = [];

      await processBatch(
        selectedKeys,
        async (key) => {
          try {
            const success = await moveToTrash(key);
            if (success) {
              successful.push(key);
            } else {
              failed.push(key);
            }
          } catch (err) {
            failed.push(key);
          }
        },
        (current, total) => {
          toast.loading(`正在删除 ${current}/${total} 个文件...`, {
            id: toastId,
          });
        },
        10,
      );

      successful.forEach((key) => {
        const item = itemMap.get(key);
        if (item) moveToTrashLocal(item);
      });

      if (failed.length === 0) {
        toast.success(`成功删除 ${successful.length} 个文件`, { id: toastId });
      } else {
        toast.error(`部分文件删除失败`, {
          id: toastId,
          description: `${failed.length} 个文件删除失败，成功删除 ${successful.length} 个`,
        });
      }
    } catch (error) {
      toast.error("操作失败", {
        id: toastId,
        description: "执行批量删除时发生未知错误",
      });
    } finally {
      clearSelection(activeType);
    }
  };


  /** ===== 批量彻底删除 ===== */
  const handleBatchPermanentDelete = async () => {
    if (!confirm(`确认【彻底删除】这 ${selectedKeys.length} 个文件？此操作不可恢复！`)) return;

    const toastId = toast.loading(`正在删除 ${selectedKeys.length} 个文件...`);

    try {
      const successful: string[] = [];
      const failed: string[] = [];

      await processBatch(
        selectedKeys,
        async (key) => {
          try {
            const success = await deleteFile(key);
            if (success) {
              successful.push(key);
            } else {
              failed.push(key);
            }
          } catch (err) {
            failed.push(key);
          }
        },
        (current, total) => {
          toast.loading(`正在彻底删除 ${current}/${total} 个文件...`, {
            id: toastId,
          });
        },
        10,
      );

      if (successful.length > 0) {
        deleteFilesLocal(successful);
      }

      if (failed.length === 0) {
        toast.success(`成功彻底删除 ${successful.length} 个文件`, { id: toastId });
      } else {
        toast.error(`部分文件删除失败`, {
          id: toastId,
          description: `${failed.length} 个文件彻底删除失败，成功删除 ${successful.length} 个`,
        });
      }
    } catch (error) {
      toast.error("操作失败", {
        id: toastId,
        description: "执行批量彻底删除时发生未知错误",
      });
    } finally {
      clearSelection(activeType);
    }
  };

  /** ===== 批量复制 ===== */
  const handleBatchCopy = async () => {
    const urls = selectedKeys
      .map((key) => {
        const file = itemMap.get(key);
        if (!file) return null;
        return getFileUrl(key);
      })
      .filter(Boolean);

    const text = urls.join("\n");
    await navigator.clipboard.writeText(text);

    toast.success(`已复制 ${urls.length} 个文件链接`);
  };

  /** ===== UI ===== */
  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 w-[calc(100%-2rem)] max-w-max">
        <div className="flex items-center gap-2 md:gap-4 rounded-full border border-glass-border bg-linear-to-r from-primary/90 to-accent/90 px-4 md:px-6 py-2.5 md:py-3 shadow-2xl backdrop-blur-xl">
          <span className="text-xs md:text-sm font-medium text-primary-foreground whitespace-nowrap">
            {`选中 ${selectedKeys.length} 项`}
          </span>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 px-2 md:px-3"
              onClick={handleBatchDownload}
              title="下载"
            >
              <Download className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">下载</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 px-2 md:px-3"
              onClick={handleBatchDelete}
              title="删除"
            >
              <Trash2 className="md:mr-2 h-4 w-4 text-red-400" />
              <span className="hidden md:inline">删除</span>
            </Button>

            <div className="h-6 w-px bg-primary-foreground/20 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Toolbox className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="top"
                className="min-w-[180px] border-glass-border bg-popover"
              >
                <DropdownMenuItem
                  onClick={() => {
                    const names = currentFiles.map((i) => i.name);
                    if (isAllSelected) {
                      removeSelection(names, activeType);
                    } else {
                      addSelection(names, activeType);
                    }
                  }}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      isAllSelected ? "text-primary" : "text-blue-400"
                    }`}
                  />
                  {isAllSelected ? "取消本页全选" : "全选当前页"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowBatchTags(true)}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <Tag className="mr-2 h-4 w-4 text-primary" />
                  编辑标签
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowBatchRename(true)}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <FilePen className="mr-2 h-4 w-4 text-blue-400" />
                  重命名
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleBatchCopy}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <Copy className="mr-2 h-4 w-4 text-blue-400" />
                  复制链接
                </DropdownMenuItem>

                <div className="my-1 h-px bg-border" />

                <DropdownMenuItem
                  onClick={handleBatchPermanentDelete}
                  className="cursor-pointer text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                  彻底删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => clearSelection(activeType)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <BatchEditTagsDialog
        files={items.filter((item) => selectedSet.has(item.name))}
        open={showBatchTags}
        onOpenChange={setShowBatchTags}
        onSuccess={handleBatchTagSuccess}
      />

      <BatchRenameDialog
        files={items.filter((item) => selectedSet.has(item.name))}
        open={showBatchRename}
        onOpenChange={setShowBatchRename}
        onSuccess={handleBatchRenameSuccess}
      />
    </>
  );
}
