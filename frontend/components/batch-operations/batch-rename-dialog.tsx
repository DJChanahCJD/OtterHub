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
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
      toast({
        title: "文件名未发生变化",
      });
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
        }),
      );

      toast({
        title: `成功重命名 ${files.length} 个文件`,
      });

      onOpenChange(false);
      onSuccess?.(updatedFiles);
    } catch (error) {
      console.error("Error renaming files:", error);
      toast({
        title: "重命名失败",
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
            <FilePen className="h-5 w-5 text-blue-400" />
            批量重命名
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 选中的文件数量 */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/80 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              已选中{" "}
              <span className="font-bold text-emerald-400">{files.length}</span>{" "}
              个文件
            </p>
          </div>

          {/* 模式选择 */}
          <div className="space-y-3">
            <Label className="text-white/80 text-sm">重命名模式</Label>
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
                      className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setMode(m)}
                    >
                      <RadioGroupItem value={m} id={m} className="mt-0.5" />
                      <div className="flex-1">
                        <Label
                          htmlFor={m}
                          className="cursor-pointer font-medium text-white/90"
                        >
                          {config.label}
                        </Label>
                        <p className="text-xs text-white/50 mt-0.5">
                          {config.description}
                        </p>
                        <p className="text-xs text-blue-400 mt-1 font-mono">
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
              <Label htmlFor="rename-value" className="text-white/80 text-sm">
                {MODE_LABELS[mode].label}内容
              </Label>
              <Input
                id="rename-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === "basename" ? "输入新文件名（不含扩展名）" : "输入要添加的内容"}
                disabled={isSubmitting}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* 预览 */}
          {mode !== "none" && value && previews.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">预览（前5个）</Label>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm font-mono"
                  >
                    <span className="text-white/60 truncate flex-1" title={preview.original}>
                      {preview.original}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <span
                      className={
                        preview.original !== preview.renamed
                          ? "text-emerald-400 truncate flex-1"
                          : "text-white/60 truncate flex-1"
                      }
                      title={preview.renamed}
                    >
                      {preview.renamed}
                    </span>
                  </div>
                ))}
                {files.length > 5 && (
                  <p className="text-xs text-white/40 text-center pt-1">
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
              className="border-white/20 text-white hover:bg-white/10"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || mode === "none" || !value}
              className="bg-blue-500 hover:bg-blue-600 text-white"
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
