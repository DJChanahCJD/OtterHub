"use client";

import { useState, useEffect } from "react";
import { FileItem } from "@/lib/types";
import { editMetadata } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FilePen, Info, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  BatchRenameMode,
  BatchRenamePayload,
  hasRenameChange,
  previewRename,
} from "@/lib/rename-utils";
import { toast } from "sonner";

interface BatchRenameDialogProps {
  files: FileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedFiles: Array<{ name: string; fileName: string }>) => void;
}

const MODE_LABELS: Record<
  BatchRenameMode,
  { label: string; description: string; example: string }
> = {
  none: { label: "选择模式", description: "", example: "" },
  prefix: {
    label: "添加前缀",
    description: "在文件名前面添加内容",
    example: "photo.jpg → 2024_photo.jpg",
  },
  suffix: {
    label: "添加后缀",
    description: "在文件名后面、扩展名前面添加内容",
    example: "video.mp4 → video_backup.mp4",
  },
  basename: {
    label: "统一名称",
    description: "将所有文件改为同一名称（保留原扩展名）",
    example: "xxx.jpg / yyy.png → travel.jpg / travel.png",
  },
};

export function BatchRenameDialog({
  files,
  open,
  onOpenChange,
  onSuccess,
}: BatchRenameDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mode, setMode] = useState<BatchRenameMode>("none");
  const [value, setValue] = useState("");

  // 对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setMode("none");
      setValue("");
    }
  }, [open]);

  const payload: BatchRenamePayload = { mode, value };
  const previews = previewRename(files, payload);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果没有任何变化，直接退出
    if (!hasRenameChange(files, payload)) {
      toast.info("文件名未发生变化");
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedFiles: Array<{ name: string; fileName: string }> = [];

      await Promise.all(
        files.map(async (file) => {
          const newFileName = renameFileName(file.metadata.fileName, payload);

          await editMetadata(file.name, { fileName: newFileName });

          updatedFiles.push({
            name: file.name,
            fileName: newFileName,
          });
        })
      );

      toast.success(`成功重命名 ${files.length} 个文件`);

      onOpenChange(false);
      onSuccess?.(updatedFiles);
    } catch (error) {
      console.error("Error renaming files:", error);
      toast.error(`重命名 ${files.length} 个文件失败`, {
        description: error instanceof Error ? error.message : "未知错误",
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
      <DialogContent className="bg-popover border-glass-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FilePen className="h-5 w-5 text-primary" />
            批量重命名
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 选中的文件数量 */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-glass-border">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              已选中{" "}
              <span className="font-bold text-primary">
                {files.length}
              </span>{" "}
              个文件
            </p>
          </div>

          {/* 模式选择 */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-sm">重命名模式</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as BatchRenameMode)}
              disabled={isSubmitting}
            >
              {(Object.keys(MODE_LABELS) as BatchRenameMode[])
                .filter((m) => m !== "none")
                .map((m) => {
                  const config = MODE_LABELS[m];
                  return (
                    <div
                      key={m}
                      className="flex items-start gap-3 p-3 rounded-lg border border-glass-border hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setMode(m)}
                    >
                      <RadioGroupItem value={m} id={m} className="mt-0.5" />
                      <div className="flex-1">
                        <Label
                          htmlFor={m}
                          className="cursor-pointer font-medium text-foreground"
                        >
                          {config.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {config.description}
                        </p>
                        <p className="text-xs text-primary mt-1 font-mono">
                          {config.example}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </RadioGroup>
          </div>

          {/* 输入框 */}
          {mode !== "none" && (
            <div className="space-y-2">
              <Label
                htmlFor="rename-value"
                className="text-muted-foreground text-sm"
              >
                {MODE_LABELS[mode].label}内容
              </Label>
              <Input
                id="rename-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  mode === "basename"
                    ? "输入新文件名（不含扩展名）"
                    : "输入要添加的内容"
                }
                disabled={isSubmitting}
                className="bg-secondary/30 border-glass-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                autoFocus
              />
            </div>
          )}

          {/* 预览 */}
          {mode !== "none" && value && previews.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                预览（前5个）
              </Label>
              <div className="p-3 rounded-lg bg-secondary/30 border border-glass-border space-y-2">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm font-mono"
                  >
                    <span
                      className="text-muted-foreground truncate flex-1"
                      title={preview.original}
                    >
                      {preview.original}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span
                      className={
                        preview.original !== preview.renamed
                          ? "text-primary truncate flex-1"
                          : "text-muted-foreground truncate flex-1"
                      }
                      title={preview.renamed}
                    >
                      {preview.renamed}
                    </span>
                  </div>
                ))}
                {files.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    ...还有 {files.length - 5} 个文件
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-glass-border text-foreground hover:bg-secondary/50"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || mode === "none" || !value}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  重命名中...
                </>
              ) : (
                "确认重命名"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Import renameFileName for use in component
function renameFileName(original: string, payload: BatchRenamePayload): string {
  if (payload.mode === "none" || !payload.value) {
    return original;
  }

  const dot = original.lastIndexOf(".");
  const hasExt = dot > 0;

  const name = hasExt ? original.slice(0, dot) : original;
  const ext = hasExt ? original.slice(dot) : "";

  switch (payload.mode) {
    case "prefix":
      return payload.value + original;
    case "suffix":
      return name + payload.value + ext;
    case "basename":
      return payload.value + ext;
    default:
      return original;
  }
}
