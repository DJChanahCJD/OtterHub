"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Download,
  Loader2,
  Key,
  Settings2,
  Trash2,
  Dices,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFromStorage, setToStorage } from "@/lib/local-storage";
import { toast } from "sonner";
import { UnifiedWallpaper } from "./types";
import { WALLPAPER_SOURCES, getSourceById } from "./sources";
import { getWallpapers, uploadByUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFileDataStore } from "@/lib/file-store";
import { FileItem, FileTag, FileType } from "@/lib/types";

export function WallpaperTab() {
  const addFileLocal = useFileDataStore((s) => s.addFileLocal);
  const [activeSourceId, setActiveSourceId] = useState<string>(
    WALLPAPER_SOURCES[0].id,
  );
  const [configs, setConfigs] = useState<Record<string, any>>({});

  const [allWallpapers, setAllWallpapers] = useState<UnifiedWallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [minPage, setMinPage] = useState(1);
  const [maxPage, setMaxPage] = useState(20);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pageSize = 20;

  const activeSource = getSourceById(activeSourceId);

  // 初始化加载所有配置
  useEffect(() => {
    const newConfigs: Record<string, any> = {};
    WALLPAPER_SOURCES.forEach((source) => {
      const saved = getFromStorage(source.storedConfig, null);
      newConfigs[source.id] = saved || source.defaultConfig;
    });
    setConfigs(newConfigs);
  }, []);

  // 当切换数据源时，重置本地页码（但不清空数据）
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSourceId]);

  // 配置变更处理
  const handleConfigChange = (sourceId: string, newConfig: any) => {
    setConfigs((prev) => ({ ...prev, [sourceId]: newConfig }));
    const source = getSourceById(sourceId);
    if (source) {
      setToStorage(source.storedConfig, newConfig);
    }
  };

  const handleApiKeySave = (newKey: string) => {
    if (!activeSource) return;
    const currentConfig = configs[activeSourceId];
    const newConfig = activeSource.setApiKey(currentConfig, newKey);
    handleConfigChange(activeSourceId, newConfig);
    toast.success(`${activeSource.name} API Key 已更新`);
  };

  const fetchWallpapers = async () => {
    if (!activeSource) return;

    const config = configs[activeSourceId];
    if (!config) return;

    const apiKey = activeSource.getApiKey(config);

    if (!apiKey) {
      toast.error(`${activeSource.name} 需要 API Key`);
      setIsApiKeyDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      // 随机选择页码
      const randomPage =
        Math.floor(Math.random() * (maxPage - minPage + 1)) + minPage;

      const data = await getWallpapers(activeSourceId, {
        ...config,
        page: randomPage,
      });

      if (data.length === 0) {
        toast.info("未找到更多壁纸");
      } else {
        setAllWallpapers((prev) => {
          // 过滤掉重复的项 (Source + ID)
          const existingKeys = new Set(
            prev.map((wp) => `${wp.source}-${wp.id}`),
          );
          const newUnique = data.filter(
            (wp) => !existingKeys.has(`${wp.source}-${wp.id}`),
          );
          return [...newUnique, ...prev];
        });
        setCurrentPage(1); // 跳转到第一页查看新结果
        toast.success(
          `成功从 ${activeSource.name} 获取 ${data.length} 张壁纸 (第 ${randomPage} 页)`,
        );
      }

      // 滚动到顶部
      const container = document.getElementById("wallpaper-grid-container");
      if (container) container.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      toast.error(error.message || "获取失败");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.MouseEvent, wp: UnifiedWallpaper) => {
    e.stopPropagation();
    if (!activeSource) return;
    const config = configs[activeSourceId];

    setUploadingId(wp.id);
    try {
      const fileName = `${wp.source}_${wp.id}.jpg`;
      const isNsfw = activeSource.isNsfw(config);

      const { key, fileSize } = await uploadByUrl(wp.rawUrl, fileName, isNsfw);
      
      // 构建 FileItem 并同步到本地 Store
      const fileItem: FileItem = {
        name: key,
        metadata: {
          fileName,
          fileSize,
          uploadedAt: Date.now(),
          liked: false,
          tags: isNsfw ? [FileTag.NSFW] : [],
        },
      };
      addFileLocal(fileItem, FileType.Image);
      
      toast.success("已保存到云端");
    } catch (error: any) {
      toast.error(error.message || "上传失败");
    } finally {
      setUploadingId(null);
    }
  };

  if (!activeSource) return null;

  const currentConfig = configs[activeSourceId];
  const hasApiKey =
    activeSource && currentConfig && !!activeSource.getApiKey(currentConfig);

  // 计算当前页展示的壁纸
  const displayWallpapers = allWallpapers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const totalPages = Math.ceil(allWallpapers.length / pageSize);

  return (
    <div className="flex flex-col h-full space-y-6">
        {/* 1. 顶部数据源切换区 - 独立出来 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
          <div className="space-y-3">
            <Tabs
              value={activeSourceId}
              onValueChange={setActiveSourceId}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-muted/50 border border-border/40 p-1 h-11 rounded-xl">
                {WALLPAPER_SOURCES.map((source) => (
                  <TabsTrigger
                    key={source.id}
                    value={source.id}
                    className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all px-6 h-9 text-xs font-semibold rounded-lg"
                  >
                    {source.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2 pb-1">
            {/* 随机页码范围选择 - 常驻极简版 */}
            <div
              className="flex items-center bg-muted/30 h-10 rounded-xl border border-border/40 px-3 gap-1.5 group focus-within:border-primary/40 focus-within:bg-muted/50 transition-all"
              title="随机页码范围"
            >
              <Hash className="h-3.5 w-3.5 opacity-40 group-focus-within:opacity-100 transition-opacity" />
              <input
                type="number"
                value={minPage}
                onChange={(e) =>
                  setMinPage(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-8 bg-transparent border-none p-0 text-xs font-bold text-center focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground/80 text-[10px] font-bold">
                -
              </span>
              <input
                type="number"
                value={maxPage}
                onChange={(e) =>
                  setMaxPage(
                    Math.max(minPage, parseInt(e.target.value) || minPage),
                  )
                }
                className="w-8 bg-transparent border-none p-0 text-xs font-bold text-center focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <Separator orientation="vertical" className="h-6 mx-1 opacity-20" />

            {/* 操作按钮组 */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40">
              {/* API Key 按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  hasApiKey
                    ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                    : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10",
                )}
                onClick={() => setIsApiKeyDialogOpen(true)}
                title="配置 API Key"
              >
                <Key className="h-4 w-4" />
              </Button>

              {/* 清空按钮 */}
              {allWallpapers.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAllWallpapers([]);
                    setCurrentPage(1);
                    toast.info("已清空所有结果");
                  }}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="清空当前结果"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              onClick={() => fetchWallpapers()}
              disabled={loading}
              size="icon"
              className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90"
              title="随机壁纸"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Dices className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* 2. 过滤参数区 - 采用更扁平化的 Card */}
        <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden py-0 pt-6">
          <CardContent className="p-5">
            <div className="relative pt-1">
              <div className="absolute -top-7.5 left-0 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" /> 过滤与偏好
              </div>

              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                {configs[activeSourceId] && (
                  <activeSource.ConfigPanel
                    config={configs[activeSourceId]}
                    onChange={(newConfig) =>
                      handleConfigChange(activeSourceId, newConfig)
                    }
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. 下方展示区 */}
        <div
          id="wallpaper-grid-container"
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {loading && allWallpapers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground animate-pulse font-medium">
                正在探索精彩壁纸...
              </p>
            </div>
          ) : allWallpapers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 space-y-4 py-20">
              <div className="p-6 rounded-full bg-muted/50 border border-dashed border-border/50">
                <ImageIcon className="h-16 w-16" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-muted-foreground/40">
                  空空如也...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayWallpapers.map((wp) => (
                  <div
                    key={`${wp.source}-${wp.id}`}
                    className="group relative aspect-[3/2] rounded-xl overflow-hidden border border-border/50 bg-muted shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1.5 cursor-zoom-in"
                    onClick={() => setPreviewUrl(wp.previewUrl)}
                  >
                      <img
                        src={wp.previewUrl}
                        alt={wp.source}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />

                    {/* 常驻来源 Badge */}
                    <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                      <Badge
                        variant="secondary"
                        className="bg-black/40 text-white/90 border-none text-[8px] h-4 backdrop-blur-md px-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        {wp.source}
                      </Badge>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 pointer-events-none">
                      <div className="flex items-center justify-end gap-3 pointer-events-auto">
                        <Button
                          size="icon"
                          className="h-8 w-8 rounded-xl shadow-xl bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-110 active:scale-95 group/btn"
                          onClick={(e) => handleUpload(e, wp)}
                          title={uploadingId === wp.id ? "上传中" : "下载"}
                          disabled={uploadingId === wp.id}
                        >
                          {uploadingId === wp.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 极简胶囊分页器 */}
              {totalPages > 1 && (
                <div className="flex justify-center pt-2">
                  <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border border-border/40 backdrop-blur-md shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-background/80 transition-all disabled:opacity-20"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="px-3 min-w-[60px] text-center">
                      <span className="text-[10px] font-bold tracking-tighter tabular-nums text-primary/80">
                        {currentPage}{" "}
                        <span className="opacity-30 mx-0.5">/</span>{" "}
                        {totalPages}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-background/80 transition-all disabled:opacity-20"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      {activeSource && (
        <ApiKeyDialog
          open={isApiKeyDialogOpen}
          onOpenChange={setIsApiKeyDialogOpen}
          source={activeSource}
          currentApiKey={activeSource.getApiKey(configs[activeSourceId] || {})}
          onSave={handleApiKeySave}
        />
      )}

      {/* 使用 shadcn Dialog 实现的精简预览 */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] w-auto h-auto p-0 border-none bg-transparent shadow-none gap-0 flex items-center justify-center">
          <DialogTitle className="sr-only">图片预览</DialogTitle>
          {previewUrl && (
            <div className="relative animate-in zoom-in-95 duration-200">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[90vh] w-auto object-contain rounded-lg shadow-2xl cursor-zoom-out"
                onClick={() => setPreviewUrl(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
