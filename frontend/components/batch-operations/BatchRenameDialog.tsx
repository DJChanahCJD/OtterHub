"use client";

import { useState, useEffect } from "react";
import { FileItem } from "@shared/types";
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
  renameFileName,
  processBatch,
} from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [mode, setMode] = useState<BatchRenameMode>("none");
  const [value, setValue] = useState("");

  // 对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setMode("none");
      setValue("");
      setProgress({ current: 0, total: 0 });
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
      setProgress({ current: 0, total: files.length });

      await processBatch(
        files,
        async (file) => {
          const newFileName = renameFileName(file.metadata?.fileName, payload);

          await editMetadata(file.name, { fileName: newFileName });

          updatedFiles.push({
            name: file.name,
            fileName: newFileName,
          });
        },
        (current, total) => setProgress({ current, total }),
        10,
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
      <DialogContent className="bg-popover border-glass-border text-foreground max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FilePen className="h-5 w-5 text-primary" />
            批量重命名
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 scrollbar-thin scrollbar-thumb-glass-border">
            {/* 选中的文件数量 */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-glass-border">
              <p className="text-sm text-foreground/60 flex items-center gap-2">
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
              <Label className="text-foreground/60 text-sm">重命名模式</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as BatchRenameMode)}
                disabled={isSubmitting}
                className="gap-3"
              >
                {(Object.keys(MODE_LABELS) as BatchRenameMode[])
                  .filter((m) => m !== "none")
                  .map((m) => {
                    const config = MODE_LABELS[m];
                    const isSelected = mode === m;
                    return (
                      <Label
                        key={m}
                        htmlFor={m}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                          isSelected 
                            ? "border-primary bg-primary/5 shadow-xs" 
                            : "border-glass-border hover:bg-secondary/50"
                        )}
                      >
                        <RadioGroupItem value={m} id={m} className="mt-1 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="font-medium text-foreground">
                            {config.label}
                          </div>
                          <p className="text-xs text-foreground/60 leading-relaxed">
                            {config.description}
                          </p>
                            <code className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              {config.example}
                            </code>
                        </div>
                      </Label>
                    );
                  })}
              </RadioGroup>
            </div>

            {/* 输入框 */}
            {mode !== "none" && (
              <div className="space-y-2">
                <Label
                  htmlFor="rename-value"
                  className="text-foreground/60 text-sm"
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
                  className="bg-secondary/30 border-glass-border text-foreground placeholder:text-foreground/60 focus-visible:ring-primary"
                  autoFocus
                />
              </div>
            )}

            {/* 预览 */}
            {mode !== "none" && value && previews.length > 0 && (
              <div className="space-y-2">
                <Label className="text-foreground/60 text-sm">
                  预览（前5个）
                </Label>
                <div className="p-3 rounded-lg bg-secondary/30 border border-glass-border space-y-2">
                  {previews.map((preview, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm font-mono"
                    >
                      <span
                        className="text-foreground/60 truncate flex-1"
                        title={preview.original}
                      >
                        {preview.original}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span
                        className={
                          preview.original !== preview.renamed
                            ? "text-primary truncate flex-1"
                            : "text-foreground/60 truncate flex-1"
                        }
                        title={preview.renamed}
                      >
                        {preview.renamed}
                      </span>
                    </div>
                  ))}
                  {files.length > 5 && (
                    <p className="text-xs text-foreground/60 text-center pt-1">
                      ...还有 {files.length - 5} 个文件
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 sticky bottom-0 bg-popover border-t border-glass-border p-6 gap-2">
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
                  {progress.total > 0
                    ? `重命名中 ${progress.current}/${progress.total}`
                    : "重命名中..."}
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

