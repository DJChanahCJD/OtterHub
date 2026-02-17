"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { syncKeyApi, SyncKeyItem } from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function KeyManageTab() {
  const [keys, setKeys] = useState<SyncKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SyncKeyItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchKeys = useCallback(async (silent = false) => {
    setIsLoading(true);
    try {
      const data = await syncKeyApi.list();
      setKeys(data);
    } catch (error) {
      console.error("Failed to fetch keys", error);
      if (!silent) toast.error("获取密钥列表失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys(true);
  }, [fetchKeys]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const newKey = await syncKeyApi.create(prefix || undefined);
      toast.success(`密钥创建成功: ${newKey}`);
      setPrefix("");
      await fetchKeys(true);
    } catch (error: any) {
      toast.error("创建失败: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await syncKeyApi.delete(deleteTarget.key);
      toast.success("密钥已删除");
      setKeys((prev) => prev.filter((k) => k.key !== deleteTarget.key));
    } catch (error: any) {
      toast.error("删除失败: " + error.message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 pr-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold">密钥管理</h2>
          <p className="text-sm text-muted-foreground">管理同步空间密钥</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchKeys()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <Separator />

      <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-base">创建新密钥</CardTitle>
          </div>
          <CardDescription>可选前缀，便于识别和管理</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="prefix" className="text-xs text-muted-foreground">
                前缀（可选）
              </Label>
              <Input
                id="prefix"
                placeholder="如: djchan"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="h-9 rounded-xl"
                maxLength={20}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="rounded-xl h-9"
              >
                {isCreating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                创建
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            前缀仅支持字母、数字、下划线和连字符，最长 20 字符
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {keys.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground/50">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无密钥</p>
          </div>
        )}

        {keys.map((item) => (
          <Card
            key={item.key}
            className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-violet-500 shrink-0" />
                    <code className="text-sm font-mono bg-muted/50 px-2 py-0.5 rounded-lg truncate">
                      {item.key}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {item.lastSyncTime
                        ? `最后同步: ${format(item.lastSyncTime, "yyyy-MM-dd HH:mm")}`
                        : "从未同步"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(item.key)}
                    className="h-8 w-8 rounded-lg"
                    title="复制"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(item)}
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <p>确定要删除此密钥吗？</p>
            <code className="block text-xs bg-muted/50 px-2 py-1 rounded-lg">
              {deleteTarget?.key}
            </code>
            <p className="text-xs text-muted-foreground">
              删除后，使用该密钥的客户端将无法同步数据。
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
