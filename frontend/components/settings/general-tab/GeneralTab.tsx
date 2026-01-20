"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Zap, 
  CloudSync, 
  Save,
  Info,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFileUIStore } from "@/lib/file-store";
import { getSettings } from "@/lib/api/settings";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { cn } from "@/lib/utils";

export function GeneralTab() {
  const { 
    dataSaverThreshold, 
    setDataSaverThreshold, 
    nsfwDetection, 
    setNsfwDetection,
    syncGeneralSettings
  } = useFileUIStore();

  const [localThreshold, setLocalThreshold] = useState(dataSaverThreshold.toString());
  const [isSyncing, setIsSyncing] = useState(false);

  // 初始化时尝试从云端拉取
  useEffect(() => {
    const hasLocalData = localStorage.getItem(STORAGE_KEYS.DATA_SAVER_THRESHOLD);
    if (!hasLocalData) {
      handleFetchFromCloud();
    }
  }, []);

  // 当全局状态变化时更新本地显示
  useEffect(() => {
    setLocalThreshold(dataSaverThreshold.toString());
  }, [dataSaverThreshold]);

  // 从云端同步
  const handleFetchFromCloud = async () => {
    setIsSyncing(true);
    try {
      const settings = await getSettings();
      if (settings?.general) {
        const { dataSaverThreshold: cloudThreshold, nsfwDetection: cloudNsfw } = settings.general;
        setDataSaverThreshold(cloudThreshold);
        setNsfwDetection(cloudNsfw);
        setLocalThreshold(cloudThreshold.toString());
        toast.success("已从云端同步常规设置");
      } else {
        toast.info("云端暂无常规设置数据");
      }
    } catch (error) {
      toast.error("从云端同步失败");
    } finally {
      setIsSyncing(false);
    }
  };

  // 保存设置
  const handleSave = async () => {
    const threshold = parseFloat(localThreshold);
    if (isNaN(threshold) || threshold < 0) {
      toast.error("请输入有效的阈值数字");
      return;
    }

    setDataSaverThreshold(threshold);
    
    try {
      await syncGeneralSettings();
      toast.success("设置已保存并同步到云端");
    } catch (error) {
      toast.error("同步到云端失败，但已保存到本地");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar space-y-6 pr-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight">常规设置</h2>
          <p className="text-sm text-muted-foreground">管理系统行为与全局偏好</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetchFromCloud}
            disabled={isSyncing}
            className="rounded-xl"
          >
            <CloudSync className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            从云端拉取
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Save className="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </div>
      </div>

      <Separator className="opacity-50" />

      <div className="grid gap-6">
        {/* 1. 省流模式设置 */}
        <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">图片加载策略</CardTitle>
            </div>
            <CardDescription>控制省流模式下的图片加载行为</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold" className="text-sm font-medium">省流无图阈值 (MB)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="threshold"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={localThreshold}
                    onChange={(e) => setLocalThreshold(e.target.value)}
                    className="w-24 h-9 text-right font-mono text-xs rounded-lg bg-background/50"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5 bg-muted/30 p-2 rounded-lg border border-border/20">
                <Info className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                当加载模式切换为“省流”时，文件大小超过此阈值的图片将不会被加载预览图。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. 上传安全设置 */}
        <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base">上传安全设置</CardTitle>
            </div>
            <CardDescription>配置上传时的安全检查行为</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">NSFW.js 自动检测</Label>
                  <p className="text-[11px] text-muted-foreground">上传图片前进行本地内容识别</p>
                </div>
                <Switch
                  checked={nsfwDetection}
                  onCheckedChange={setNsfwDetection}
                />
              </div>
              
              {!nsfwDetection && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-bold">注意：</span>
                    关闭检测后，上传速度将显著提升（减少 CPU 消耗），但系统将不再自动为违规内容标记 NSFW 标签。
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5 bg-muted/30 p-2 rounded-lg border border-border/20">
                <Info className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                开启后，系统将在浏览器端使用 TensorFlow.js 对图片进行识别。这可能会消耗较多内存和 CPU。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
