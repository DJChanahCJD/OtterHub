"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  ShieldCheck, Zap, CloudSync, CloudUpload, Info, ShieldAlert, FolderOpen, 
  Trash2, RefreshCw, Download, AlertCircle, Tags, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGeneralSettingsStore } from "@/stores/general-store";
import { cn } from "@/lib/utils";
import {
  loadDirectoryHandle, clearDirectoryHandleCache, pickDownloadDirectoryForFirstTime,
} from "@/lib/utils/file";
import { TagSelector } from "@/components/TagSelector";

const SettingCard = ({ icon: Icon, iconColor, title, desc, children }: any) => (
  <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      {desc && <CardDescription>{desc}</CardDescription>}
    </CardHeader>
    <CardContent className="grid gap-4">{children}</CardContent>
  </Card>
);

const SettingItem = ({ title, desc, children }: any) => (
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label className="text-sm font-medium">{title}</Label>
      {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
    </div>
    {children}
  </div>
);

const HintBox = ({ icon: Icon = Info, variant = "default", children }: any) => {
  const styles = {
    default: "bg-muted/30 border-border/20 text-muted-foreground",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
  };
  return (
    <div className={cn("flex items-start gap-1.5 p-1.5 rounded-lg border text-xs leading-relaxed", styles[variant as keyof typeof styles])}>
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-80" />
      <div>{children}</div>
    </div>
  );
};

// --- 主组件 ---
export function GeneralTab() {
  const store = useGeneralSettingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(store.dataSaverThreshold.toString());
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [isDirLoading, setIsDirLoading] = useState(false);
  const [supportsFsApi, setSupportsFsApi] = useState(false);

  // 初始化 FsApi & 读取目录
  useEffect(() => {
    const isSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;
    setSupportsFsApi(isSupported);
    if (isSupported) {
      loadDirectoryHandle().then(handle => setCurrentDir(handle?.name || null)).catch(() => setCurrentDir(null));
    }
  }, []);

  // 阈值防抖同步
  useEffect(() => setLocalThreshold(store.dataSaverThreshold.toString()), [store.dataSaverThreshold]);
  useEffect(() => {
    const threshold = parseFloat(localThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold === store.dataSaverThreshold) return;
    const timer = setTimeout(() => store.setDataSaverThreshold(threshold), 500);
    return () => clearTimeout(timer);
  }, [localThreshold, store.dataSaverThreshold, store.setDataSaverThreshold]);

  // 异步操作工厂函数
  const withLoading = (action: () => Promise<any>, setLoader: (val: boolean) => void, successMsg?: string, errorMsg?: string) => async () => {
    setLoader(true);
    try {
      const res = await action();
      if (successMsg) toast.success(successMsg);
      return res;
    } catch {
      if (errorMsg) toast.error(errorMsg);
    } finally {
      setLoader(false);
    }
  };

  const handleChangeDirectory = withLoading(async () => {
    const result = await pickDownloadDirectoryForFirstTime();
    if (result) {
      setCurrentDir(result.dirName);
      toast.success(`已切换到: ${result.dirName}`);
    }
  }, setIsDirLoading, undefined, "更换失败");

  const handleClearDirectory = withLoading(async () => {
    await clearDirectoryHandleCache();
    setCurrentDir(null);
  }, setIsDirLoading, "已清除，下次下载需重新选择目录", "清除失败");

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar space-y-6 pr-2">
      {/* 头部区域 */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight">常规设置</h2>
          <p className="text-sm text-muted-foreground">更改自动保存，可手动同步到云端</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={withLoading(store.fetchSettings, setIsSyncing, "同步成功", "同步失败")} disabled={isSyncing} className="rounded-xl h-9">
            <CloudSync className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            从云端同步
          </Button>
          <Button size="sm" onClick={withLoading(store.syncSettings, setIsUploading, "备份成功", "备份失败")} disabled={isUploading} className="rounded-xl h-9 shadow-sm">
            <CloudUpload className={cn("h-4 w-4 mr-2", isUploading && "animate-spin")} />
            备份到云端
          </Button>
        </div>
      </div>

      <Separator className="opacity-50" />

      <div className="grid gap-6">
        {/* 1. 省流模式设置 */}
        <SettingCard icon={Zap} iconColor="text-amber-500" title="图片加载策略">
          <div className="flex flex-col space-y-3">
            <SettingItem title="省流模式阈值">
              <div className="flex items-center gap-2">
                <Input type="number" step="0.1" min="0.1" value={localThreshold} onChange={(e) => setLocalThreshold(e.target.value)} className="w-24 h-9 text-right font-mono text-xs rounded-lg bg-background/50" />
                MB
              </div>
            </SettingItem>
            <HintBox>省流模式下，超过此大小的图片不加载预览。</HintBox>
          </div>
        </SettingCard>

        {/* 2. 上传设置 */}
        <SettingCard icon={ShieldCheck} iconColor="text-emerald-500" title="上传设置">
          <div className="flex flex-col space-y-4">
            <SettingItem title="NSFW 内容检测" desc="上传前本地检测敏感内容">
              <Switch checked={store.nsfwDetection} onCheckedChange={store.setNsfwDetection} />
            </SettingItem>
            {!store.nsfwDetection && (
              <HintBox icon={ShieldAlert} variant="warning">
                关闭后上传更快，但敏感内容不会自动标记 NSFW。
              </HintBox>
            )}

            <SettingItem title="AI 智能分析" desc="上传后智能识别生成描述">
              <Switch checked={store.enableImageAnalysis} onCheckedChange={store.setEnableImageAnalysis} />
            </SettingItem>
            {!store.enableImageAnalysis && (
              <HintBox icon={Sparkles} variant="info">
                关闭后跳过 AI 分析，可节省一次 KV 写操作
              </HintBox>
            )}

            <SettingItem title="默认上传标签" desc="上传时自动添加的标签">
              <TagSelector tags={store.defaultUploadTags} onChange={store.setDefaultUploadTags} placeholder="选择默认标签..." />
            </SettingItem>
          </div>
        </SettingCard>

        {/* 4. 下载管理 */}
        {supportsFsApi ? (
          <SettingCard icon={Download} iconColor="text-orange-500" title="下载管理">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/20">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">批量下载目录</p>
                  <p className="text-xs text-muted-foreground">{currentDir || "未设置"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleChangeDirectory} disabled={isDirLoading} className="h-9">
                  <RefreshCw className={cn("h-4 w-4 mr-2", isDirLoading && "animate-spin")} />
                  更换目录
                </Button>
                {currentDir && (
                  <Button variant="ghost" size="sm" onClick={handleClearDirectory} className="h-9" title="清除目录">
                      <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <HintBox>首次批量下载需选择目录。建议提前创建 OtterHub 文件夹。目录授权失效时会重新提示。</HintBox>
          </SettingCard>
        ) : (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">下载功能不可用</AlertTitle>
            <AlertDescription className="text-yellow-700">
              当前浏览器不支持自定义下载目录，请使用 Chrome 或 Edge。
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}