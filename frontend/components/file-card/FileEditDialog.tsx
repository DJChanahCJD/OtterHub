"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { editMetadata } from "@/lib/api";
import { FileItem } from "@shared/types";
import { Label } from "@radix-ui/react-dropdown-menu";
import { TagSelector } from "@/components/TagSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditMetadataDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (metadata: { fileName: string; tags: string[] }) => void;
}

export function FileEditDialog({
  file,
  open,
  onOpenChange,
  onSuccess,
}: EditMetadataDialogProps) {
  const [baseName, setBaseName] = useState("");
  const [extension, setExtension] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (file) {
      const fullFileName = file.metadata.fileName || "";
      const lastDotIndex = fullFileName.lastIndexOf(".");
      
      // 如果文件名中有点，且不是在开头（如 .gitignore），则分离扩展名
      if (lastDotIndex > 0) {
        setBaseName(fullFileName.substring(0, lastDotIndex));
        setExtension(fullFileName.substring(lastDotIndex));
      } else {
        setBaseName(fullFileName);
        setExtension("");
      }
      
      setTags(file.metadata?.tags || []);
    }
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return;

    if (!baseName.trim()) {
      toast.warning("文件名不能为空");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedMetadata = {
        fileName: `${baseName.trim()}${extension}`,
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
            <Label className="text-foreground/80">文件名</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="fileName"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="输入文件名"
                className="bg-secondary/30 border-glass-border text-foreground placeholder:text-foreground/60 focus-visible:ring-primary flex-1"
                disabled={isSubmitting}
              />
              {extension && (
                <span className="text-foreground/60 font-mono text-sm bg-secondary/20 px-2 py-2 rounded-md border border-glass-border whitespace-nowrap">
                  {extension}
                </span>
              )}
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label className="text-foreground/80">标签</Label>
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
