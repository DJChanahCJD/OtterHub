"use client";

import { useState, useMemo, useEffect } from "react";
import { FileTag, FileItem } from "@/lib/types";
import { editMetadata } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag, Info } from "lucide-react";
import { BatchTagEditor } from "./batch-tag-editor";
import { applyTagStates, calcOriginalTagStates, hasAnyTagChange, nextTagState, TagStateMap } from "@/lib/tag-utils";

interface BatchAddTagsDialogProps {
  files: FileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedFiles: Array<{ name: string; tags: string[] }>) => void;
}

export function BatchEditTagsDialog({
  files,
  open,
  onOpenChange,
  onSuccess,
}: BatchAddTagsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 计算原始状态（只算一次，作为基准）
  const originalStates = useMemo(() => calcOriginalTagStates(files), [files]);

  // 当前的标签状态
  const [currentStates, setTagStates] = useState<TagStateMap>(originalStates);

  // 对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setTagStates(originalStates);
    }
  }, [open, originalStates]);

  // 切换标签状态
  const handleToggle = (tag: FileTag) => {
    setTagStates((prev) => ({
      ...prev,
      [tag]: nextTagState(prev[tag], originalStates[tag]),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果没有任何变化，直接退出
    if (!hasAnyTagChange(currentStates, originalStates)) {
      toast({
        title: "没有标签变更",
      });
      onOpenChange(false);
      return;
    }
  
    setIsSubmitting(true);

    try {
      const updatedFiles: Array<{ name: string; tags: string[] }> = [];

      await Promise.all(
        files.map(async (file) => {
          const newTags = applyTagStates(
            (file.metadata?.tags ?? []) as FileTag[],
            currentStates,
            originalStates,
          );

          await editMetadata(file.name, { tags: newTags });

          updatedFiles.push({
            name: file.name,
            tags: newTags,
          });
        }),
      );

      toast({
        title: `成功更新 ${files.length} 个文件的标签`,
      });

      onOpenChange(false);
      onSuccess?.(updatedFiles);
    } catch (error) {
      console.error("Error updating tags:", error);
      toast({
        title: "更新标签失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0d2137] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-400" />
            批量编辑标签
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 选中的文件数量 */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/80 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              已选中{" "}
              <span className="font-bold text-emerald-400">
                {files.length}
              </span>{" "}
              个文件
            </p>
          </div>

          {/* 批量标签编辑器 */}
          <BatchTagEditor
            currentStates={currentStates}
            originalStates={originalStates}
            onToggle={handleToggle}
            disabled={isSubmitting}
          />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-white/20 text-white hover:bg-white/10"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                "更新标签"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
