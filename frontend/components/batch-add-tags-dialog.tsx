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
import { BatchTagEditor } from "@/components/batch-tag-editor";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag, Info } from "lucide-react";

interface BatchAddTagsDialogProps {
  files: FileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedFiles: Array<{ name: string; tags: string[] }>) => void;
}

export function BatchAddTagsDialog({
  files,
  open,
  onOpenChange,
  onSuccess,
}: BatchAddTagsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化选中标签：所有文件都有的标签默认选中
  const initialCheckedTags = useMemo(() => {
    const checked = new Set<FileTag>();
    const allTags = Object.values(FileTag);
    const fileCount = files.length;

    if (fileCount === 0) return checked;

    allTags.forEach((tag) => {
      const filesWithTag = files.filter(
        (file) => file.metadata?.tags?.includes(tag)
      ).length;
      // 只有当所有文件都有这个标签时，才默认选中
      if (filesWithTag === fileCount) {
        checked.add(tag);
      }
    });

    return checked;
  }, [files]);

  // 当前选中的标签状态
  const [checkedTags, setCheckedTags] = useState<Set<FileTag>>(initialCheckedTags);

  // 对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setCheckedTags(initialCheckedTags);
    }
  }, [open, initialCheckedTags]);

  // 切换标签状态
  const handleTagToggle = (tag: FileTag) => {
    setCheckedTags((prev) => {
      const newChecked = new Set(prev);
      if (newChecked.has(tag)) {
        newChecked.delete(tag);
      } else {
        newChecked.add(tag);
      }
      return newChecked;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const targetTags = Array.from(checkedTags);
      const updatedFiles: Array<{ name: string; tags: string[] }> = [];

      // 批量更新每个文件的标签
      const updatePromises = files.map(async (file) => {
        await editMetadata(file.name, {
          tags: targetTags,
        });

        updatedFiles.push({
          name: file.name,
          tags: targetTags,
        });
      });

      await Promise.all(updatePromises);

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
              已选中 <span className="font-bold text-emerald-400">{files.length}</span>{" "}
              个文件
            </p>
          </div>

          {/* 批量标签编辑器 */}
          <BatchTagEditor
            files={files}
            checkedTags={checkedTags}
            onTagToggle={handleTagToggle}
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
