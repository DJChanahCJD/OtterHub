"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { editMetadata, analyzeImage, getFileUrl } from "@/lib/api";
import { FileItem, MAX_FILENAME_LENGTH, MAX_DESC_LENGTH, FileType } from "@shared/types";
import { compressImageFromUrl } from "@/lib/utils/file";
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
import { Textarea } from "@/components/ui/textarea";

interface EditMetadataDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (metadata: { fileName: string; tags: string[]; desc?: string }) => void;
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
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 计算完整文件名长度
  const fullFileNameLength = baseName.length + extension.length;
  
  // 验证状态
  const isFileNameValid = baseName.trim().length > 0 && fullFileNameLength <= MAX_FILENAME_LENGTH;
  const isDescValid = desc.length <= MAX_DESC_LENGTH;
  const canSubmit = isFileNameValid && isDescValid;

  // 判断是否为图片文件
  const isImageFile = file?.name?.startsWith(`${FileType.Image}:`);

  // 初始化表单数据
  useEffect(() => {
    if (file) {
      const fullFileName = file.metadata?.fileName || "";
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
      setDesc(file.metadata?.desc || "");
    }
  }, [file]);

  // AI分析图片生成描述
  const handleAnalyzeImage = async () => {
    if (!file || isAnalyzing) return;

    const imgUrl = file.metadata?.thumbUrl || getFileUrl(file.name);

    setIsAnalyzing(true);
    try {
      const blob = await compressImageFromUrl(imgUrl);
      const result = await analyzeImage(file.name, blob);
      const newDesc = result.desc || "";
      
      // 如果超过长度限制，截断
      if (newDesc.length > MAX_DESC_LENGTH) {
        setDesc(newDesc.slice(0, MAX_DESC_LENGTH));
        toast.info("描述已生成，但超过长度限制已自动截断");
      } else {
        setDesc(newDesc);
        toast.success("AI分析完成");
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("AI分析失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return;

    if (!isFileNameValid) {
      toast.warning(baseName.trim() ? "文件名过长" : "文件名不能为空");
      return;
    }

    if (!isDescValid) {
      toast.warning("描述过长");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedMetadata = {
        fileName: `${baseName.trim()}${extension}`,
        tags,
        desc: desc.trim() || undefined,
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
                className={`bg-secondary/30 border-glass-border text-foreground placeholder:text-foreground/60 focus-visible:ring-primary flex-1 ${!isFileNameValid && baseName ? "border-red-500/50 focus-visible:ring-red-500" : ""}`}
                disabled={isSubmitting}
              />
              {extension && (
                <span className="text-foreground/60 font-mono text-sm bg-secondary/20 px-2 py-2 rounded-md border border-glass-border whitespace-nowrap">
                  {extension}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={!isFileNameValid && baseName ? "text-red-400" : "text-foreground/40"}>
                {baseName.trim() ? (fullFileNameLength > MAX_FILENAME_LENGTH ? `文件名过长：${fullFileNameLength} / ${MAX_FILENAME_LENGTH}` : "") : (baseName ? "文件名不能为空" : "")}
              </span>
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

          {/* 描述 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground/80">描述</Label>
              {isImageFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing || isSubmitting}
                  className="h-7 px-2 text-xs text-primary hover:text-primary/80"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="添加文件描述..."
              className={`bg-secondary/30 border-glass-border text-foreground placeholder:text-foreground/60 focus-visible:ring-primary max-h-[120px] resize-none ${!isDescValid ? "border-red-500/50 focus-visible:ring-red-500" : ""}`}
              disabled={isSubmitting || isAnalyzing}
              rows={3}
            />
            <div className="flex justify-end text-xs">
              <span className={`${desc.length > MAX_DESC_LENGTH ? "text-red-400" : "text-foreground/40"}`}>
                {desc.length}/{MAX_DESC_LENGTH}
              </span>
            </div>
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
              disabled={isSubmitting || !canSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
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
