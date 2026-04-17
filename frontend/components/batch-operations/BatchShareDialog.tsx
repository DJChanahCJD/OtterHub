"use client";

import { useState, useEffect } from "react";
import { FileItem } from "@shared/types";
import { shareApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Share2, Info, Copy } from "lucide-react";

interface BatchShareDialogProps {
  files: FileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 打包分享对话框组件
 * 将多个文件打包为一个分享链接
 */
export function BatchShareDialog({
  files,
  open,
  onOpenChange,
}: BatchShareDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // 表单状态
  const [expireIn, setExpireIn] = useState<string>('3600');
  const [customDays, setCustomDays] = useState<string>('1');
  const [oneTime, setOneTime] = useState(false);

  // 对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setShareLink(null);
      setExpireIn('3600');
      setCustomDays('1');
      setOneTime(false);
    }
  }, [open]);

  const handleCreateLink = async () => {
    setIsSubmitting(true);

    try {
      // 计算过期秒数
      let seconds: number | undefined;
      if (expireIn === 'custom') {
        const days = parseInt(customDays);
        if (isNaN(days) || days < 1 || days > 365) {
          toast.error('请输入有效的天数 (1-365)');
          setIsSubmitting(false);
          return;
        }
        seconds = days * 86400;
      } else {
        seconds = expireIn === '-1' ? undefined : parseInt(expireIn);
      }

      const data = await shareApi.create({
        type: 'bundle',
        fileKeys: files.map(f => f.name),
        expireIn: seconds,
        oneTime,
      });

      const url = `${window.location.origin}/s?k=${data.token}`;
      setShareLink(url);
      toast.success(`成功创建打包分享链接（${data.fileCount || files.length} 个文件）`);
    } catch (error) {
      toast.error('创建分享链接失败');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('链接已复制到剪贴板');
    }
  };

  const handleReset = () => {
    setShareLink(null);
    setExpireIn('3600');
    setCustomDays('1');
    setOneTime(false);
  };

  const handleClose = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
      setTimeout(handleReset, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-popover border-glass-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            打包分享
          </DialogTitle>
          <DialogDescription>
            将选中的文件打包为一个分享链接
          </DialogDescription>
        </DialogHeader>

        {!shareLink ? (
          <div className="grid gap-4 py-4">
            {/* 选中的文件数量 */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-glass-border">
              <p className="text-sm text-foreground/60 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                已选中{' '}
                <span className="font-bold text-primary">
                  {files.length}
                </span>{' '}
                个文件
              </p>
            </div>

            {/* 过期时间选择 */}
            <div className="grid gap-2">
              <Label htmlFor="expire">过期时间</Label>
              <Select value={expireIn} onValueChange={setExpireIn} disabled={isSubmitting}>
                <SelectTrigger id="expire" className="bg-secondary/30 border-glass-border text-foreground">
                  <SelectValue placeholder="选择过期时间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 小时</SelectItem>
                  <SelectItem value="86400">1 天</SelectItem>
                  <SelectItem value="604800">7 天</SelectItem>
                  <SelectItem value="2592000">30 天</SelectItem>
                  <SelectItem value="custom">自定义（天数）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 自定义天数 */}
            {expireIn === 'custom' && (
              <div className="grid gap-2">
                <Label htmlFor="custom-days">天数（最大 365）</Label>
                <Input
                  id="custom-days"
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCustomDays('');
                      return;
                    }
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      if (num > 365) setCustomDays('365');
                      else if (num < 1) setCustomDays('1');
                      else setCustomDays(val);
                    }
                  }}
                  placeholder="输入天数"
                  disabled={isSubmitting}
                  className="bg-secondary/30 border-glass-border text-foreground"
                />
              </div>
            )}

            {/* 阅后即焚 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="one-time"
                checked={oneTime}
                onCheckedChange={(c) => setOneTime(c === true)}
                disabled={isSubmitting}
              />
              <Label htmlFor="one-time" className="cursor-pointer text-sm">
                阅后即焚（下载一次后自动失效）
              </Label>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">链接</Label>
              <Input id="link" value={shareLink} readOnly className="bg-secondary/30 border-glass-border text-foreground" />
            </div>
            <Button size="sm" className="px-3" onClick={handleCopy}>
              <span className="sr-only">复制</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {!shareLink ? (
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
                className="border-glass-border text-foreground hover:bg-secondary/50"
              >
                取消
              </Button>
              <Button
                onClick={handleCreateLink}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                创建分享链接
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-end gap-2">
              <Button variant="secondary" onClick={handleReset} className="border-glass-border text-foreground hover:bg-secondary/50">
                再次创建
              </Button>
              <Button onClick={() => handleClose(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                完成
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
