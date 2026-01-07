"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { TagSelector } from "@/components/tag-selector";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag } from "lucide-react";

interface BatchAddTagsDialogProps {
  files: FileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedFiles: Array<{ name: string; tags: string[] }>) => void;
}

// 标签配置
const TAG_CONFIG = {
  [FileTag.NSFW]: {
    label: "NSFW",
    description: "敏感内容",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-300",
  },
  [FileTag.Private]: {
    label: "Private",
    description: "私有文件",
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-300",
  },
};

export function BatchAddTagsDialog({
  files,
  open,
  onOpenChange,
  onSuccess,
}: BatchAddTagsDialogProps) {
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBatchAddTags = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTags.length === 0) {
      toast({
        title: "请至少选择一个标签",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 收集更新结果
      const updatedFiles: Array<{ name: string; tags: string[] }> = [];

      // 批量更新每个文件的标签
      const updatePromises = files.map(async (file) => {
        // 合并现有标签和新标签
        const existingTags = file.metadata?.tags || [];
        const newTags = Array.from(
          new Set([...existingTags, ...selectedTags])
        );

        await editMetadata(file.name, {
          tags: newTags,
        });

        // 记录更新结果
        updatedFiles.push({
          name: file.name,
          tags: newTags,
        });
      });

      await Promise.all(updatePromises);

      toast({
        title: `成功为 ${files.length} 个文件添加标签`,
      });

      // 重置状态
      setSelectedTags([]);
      onOpenChange(false);
      onSuccess?.(updatedFiles);
    } catch (error) {
      console.error("Error adding tags:", error);
      toast({
        title: "添加标签失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedTags([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0d2137] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-400" />
            批量添加标签
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleBatchAddTags} className="space-y-6">
          {/* 选中的文件数量 */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/80">
              已选中 <span className="font-bold text-emerald-400">{files.length}</span>{" "}
              个文件
            </p>
          </div>

          {/* 标签选择器 */}
          <div className="space-y-2">
            <Label className="text-white/80">Tags</Label>
            <TagSelector
              tags={selectedTags}
              onChange={setSelectedTags}
            />
          </div>

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
              disabled={isSubmitting || selectedTags.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  添加中...
                </>
              ) : (
                <>
                  添加
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
