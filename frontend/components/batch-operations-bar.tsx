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

import { useActiveItems, useActiveSelectedKeys, useFileStore } from "@/lib/file-store";
import { getFileUrl, moveToTrash } from "@/lib/api";
import { downloadFile } from "@/lib/utils";
import { DIRECT_DOWNLOAD_LIMIT, FileType } from "@/lib/types";
import { BatchEditTagsDialog } from "./batch-operations/batch-edit-tags-dialog";
import { BatchRenameDialog } from "./batch-operations/batch-rename-dialog";
import { toast } from "sonner";

export function BatchOperationsBar() {
  const fileStore = useFileStore();
  const {
    clearSelection,
    selectAll,
    updateFileMetadata,
    activeType,
    moveToTrashLocal,
  } = fileStore;

  const selectedKeys = useActiveSelectedKeys();

  const [showBatchTags, setShowBatchTags] = useState(false);
  const [showBatchRename, setShowBatchRename] = useState(false);

  const items = useActiveItems();

  /** ===== 派生数据 ===== */
  const selectedSet = useMemo(
    () => new Set(selectedKeys),
    [selectedKeys],
  );

  const itemMap = useMemo(
    () => new Map(items.map((f) => [f.name, f])),
    [items],
  );

  const isAllSelected =
    items.length > 0 && selectedKeys.length === items.length;

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

    for (const key of selectedKeys) {
      const file = itemMap.get(key);
      if (!file) continue;

      const { fileSize, fileName } = file.metadata;

      if (isMediaType && fileSize > DIRECT_DOWNLOAD_LIMIT) {
        oversizedFiles.push(fileName);
        continue;
      }

      downloadFile(getFileUrl(key), file.metadata);
    }

    if (oversizedFiles.length > 0) {
      toast.error("部分文件未自动下载", {
        description: `以下 ${oversizedFiles.length} 个文件过大，请在新页面使用浏览器原生控件下载：\n${oversizedFiles.join(
          "、",
        )}`,
      });
    }
  };

  /** ===== 批量删除 ===== */
  const handleBatchDelete = async () => {
    if (!confirm(`确认删除这 ${selectedKeys.length} 个文件？`)) return;

    const results = await Promise.all(
      selectedKeys.map(async (key) => {
        const success = await moveToTrash(key);
        return { key, success };
      }),
    );

    const failed = results.filter((r) => !r.success);

    results
      .filter((r) => r.success)
      .forEach((r) => moveToTrashLocal(itemMap.get(r.key)!));

    if (failed.length > 0) {
      toast.error("部分文件删除失败", {
        description: failed.map((f) => f.key).join("、"),
      });
    }

    clearSelection();
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
            {selectedKeys.length}{" "}
            <span className="hidden sm:inline">
              {selectedKeys.length === 1 ? "file" : "files"}
            </span>{" "}
            selected
          </span>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 px-2 md:px-3"
              onClick={handleBatchDownload}
              title="Download"
            >
              <Download className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Download</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 px-2 md:px-3"
              onClick={handleBatchDelete}
              title="Delete"
            >
              <Trash2 className="md:mr-2 h-4 w-4 text-red-500" />
              <span className="hidden md:inline">Delete</span>
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
                  onClick={() => isAllSelected ? clearSelection() : selectAll()}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      isAllSelected ? "text-primary" : "text-blue-400"
                    }`}
                  />
                  {isAllSelected ? "取消全选" : "全选当前页"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowBatchTags(true)}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <Tag className="mr-2 h-4 w-4 text-primary" />
                  批量编辑标签
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowBatchRename(true)}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <FilePen className="mr-2 h-4 w-4 text-blue-400" />
                  批量重命名
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleBatchCopy}
                  className="cursor-pointer text-foreground hover:bg-secondary/50"
                >
                  <Copy className="mr-2 h-4 w-4 text-blue-400" />
                  批量复制链接
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => clearSelection()}
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
