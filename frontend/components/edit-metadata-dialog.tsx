"use client";

import { useState, useEffect } from "react";
import { FileItem, FileTag } from "@/lib/types";
import { editMetadata } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagSelector } from "@/components/tag-selector";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditMetadataDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (metadata: { fileName: string; tags: string[] }) => void;
}

export function EditMetadataDialog({
  file,
  open,
  onOpenChange,
  onSuccess,
}: EditMetadataDialogProps) {
  const [fileName, setFileName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (file) {
      setFileName(file.metadata.fileName || "");
      setTags(file.metadata?.tags || []);
    }
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return;

    if (!fileName.trim()) {
      toast.warning("文件名不能为空");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedMetadata = {
        fileName: fileName.trim(),
        tags,
      };

      await editMetadata(file.name, updatedMetadata);


        toast.success("元数据更新成功");

      onOpenChange(false);
      onSuccess?.(updatedMetadata);
    } catch (error) {
      console.error("Error updating metadata:", error);
      toast.error("更新失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-glass-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">编辑元数据</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 文件名 */}
          <div className="space-y-2">
            <Label htmlFor="fileName" className="text-muted-foreground">
              文件名
            </Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="输入文件名"
              className="bg-secondary/30 border-glass-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              disabled={isSubmitting}
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">标签</Label>
            <TagSelector
              tags={tags}
              onChange={setTags}
              disabled={isSubmitting}
              placeholder="暂无标签，点击下方按钮添加..."
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-glass-border text-foreground hover:bg-secondary/50"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
