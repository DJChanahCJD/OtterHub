"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Key,
  Settings2,
  Trash2,
  Dices,
  Hash,
  Upload,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { WALLPAPER_SOURCE_LIST } from "./sources";
import { uploadByUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFileDataStore } from "@/lib/file-store";
import { FileItem, FileTag, FileType, UnifiedWallpaper, WallpaperSourceId } from "@shared/types";
import { useWallpaperSources, useWallpaperList } from "./hooks";

export function WallpaperTab() {
  const addFileLocal = useFileDataStore((s) => s.addFileLocal);

  // 1. 使用自定义 Hook 管理数据源与配置
  const {
    activeSourceId,
    setActiveSourceId,
    configs,
    updateConfig,
    activeSource,
    hasApiKey,
    syncToCloud,
  } = useWallpaperSources();

  const [uploadingIds, setUploadingIds] = useState<Set<string | number>>(new Set());
  const [uploadedIds, setUploadedIds] = useState<Set<string | number>>(new Set());
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [minPage, setMinPage] = useState(1);
  const [maxPage, setMaxPage] = useState(20);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pageSize = 20;

  // 2. 使用自定义 Hook 管理列表与请求
  const {
    wallpapers,
    loading,
    currentPage,
    setCurrentPage,
    fetchWallpapers,
    clearList,
  } = useWallpaperList(activeSource!, configs[activeSourceId], {
    minPage,
    maxPage,
  });

  // 处理 API Key 保存
  const handleApiKeySave = async (newKey: string) => {
    if (!activeSource) return;
    const currentConfig = configs[activeSourceId];
    const newConfig = activeSource.setApiKey(currentConfig, newKey);
    
    // 1. 更新本地状态
    updateConfig(activeSourceId, newConfig);
    
    // 2. 显式同步到云端
    try {
      const nextConfigs = { ...configs, [activeSourceId]: newConfig };
      await syncToCloud(nextConfigs);
      toast.success(`${activeSource.name} API Key 已同步到云端`);
    } catch (error) {
      toast.error("同步到云端失败，请稍后重试");
    }
  };


  const handleFetch = async () => {
    try {
      await fetchWallpapers();
      // 滚动到顶部
      const container = document.getElementById("wallpaper-scroll-container");
      if (container) container.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      if (error.message === "API_KEY_MISSING") {
        setIsApiKeyDialogOpen(true);
        toast.error(`${activeSource?.name} 需要 API Key`);
      }
    }
  };

  const handleUpload = async (e: React.MouseEvent, wp: UnifiedWallpaper) => {
    e.stopPropagation();
    if (!activeSource) return;
    const config = configs[activeSourceId];

    setUploadingIds((prev) => new Set(prev).add(wp.id));
    try {
      const fileName = `${wp.source}_${wp.id}.jpg`;
      const isNsfw = activeSource.isNsfw(config);

      const { key, fileSize } = await uploadByUrl(wp.rawUrl, fileName, isNsfw);

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
      setUploadedIds((prev) => new Set(prev).add(wp.id));

      toast.success("已保存到云端");
    } catch (error: any) {
      toast.error(error.message || "上传失败");
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(wp.id);
        return next;
      });
    }
  };

  if (!activeSource) return null;

  // 计算当前页展示的壁纸
  const displayWallpapers = wallpapers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const totalPages = Math.ceil(wallpapers.length / pageSize);

  return (
    <div
      id="wallpaper-scroll-container"
      className="flex flex-col h-full overflow-y-auto custom-scrollbar space-y-6 pr-2"
    >
      {/* 1. 顶部数据源切换区 */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-1">
        <div className="w-full lg:w-auto overflow-hidden">
          <Tabs
            value={activeSourceId}
            onValueChange={(v) => setActiveSourceId(v as WallpaperSourceId)}
            className="w-full"
          >
            <TabsList className="w-full flex justify-start bg-muted/50 border border-border/40 p-1 h-11 rounded-xl overflow-x-auto overflow-y-hidden custom-scrollbar scrollbar-none">
              {WALLPAPER_SOURCE_LIST.map((source) => (
                <TabsTrigger
                  key={source.id}
                  value={source.id}
                  className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all px-4 sm:px-6 h-9 text-xs font-semibold rounded-lg"
                >
                  {source.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          <div
            className="flex items-center bg-muted/30 h-10 rounded-xl border border-border/40 px-2 sm:px-3 gap-1 group focus-within:border-primary/40 focus-within:bg-muted/50 transition-all"
            title="随机页码范围"
          >
            <Hash className="h-3.5 w-3.5 opacity-40 group-focus-within:opacity-100 transition-opacity hidden sm:block" />
            <input
              type="number"
              value={minPage}
              onChange={(e) =>
                setMinPage(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-7 sm:w-8 bg-transparent border-none p-0 text-xs font-bold text-center focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              className="w-7 sm:w-8 bg-transparent border-none p-0 text-xs font-bold text-center focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <Separator orientation="vertical" className="h-6 mx-0.5 opacity-20 hidden sm:block" />

          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40">
            {activeSource.requiresApiKey && (
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
            )}

            {wallpapers.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  clearList();
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
            onClick={handleFetch}
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

      {/* 2. 过滤参数区 */}
      <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl py-0 pt-6">
        <CardContent className="p-5">
          <div className="relative pt-1">
            <div className="absolute -top-7.5 left-0 px-1 text-[10px] font-bold uppercase tracking-widest text-foreground/60 flex items-center gap-1.5 w-full justify-between">
              <div className="flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" /> 过滤与偏好
              </div>
              {!activeSource.requiresApiKey && (
                <span className="text-[9px] text-emerald-500/80 normal-case bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                  无需 API Key
                </span>
              )}
            </div>

            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
              {configs[activeSourceId] && (
                <activeSource.ConfigPanel
                  config={configs[activeSourceId]}
                  onChange={(newConfig: any) =>
                    updateConfig(activeSourceId, newConfig)
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 下方展示区 */}
      <div className="min-h-0">
        {loading && wallpapers.length === 0 ? (
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
        ) : wallpapers.length === 0 ? (
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
              {displayWallpapers.map((wp) => {
                const isUploaded = uploadedIds.has(wp.id);
                const isUploading = uploadingIds.has(wp.id);
                return (
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

                    <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                      <Badge
                        variant="secondary"
                        className="bg-black/40 text-white/90 border-none text-[8px] h-4 backdrop-blur-md px-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        {wp.source}
                      </Badge>
                    </div>

                    {/* 上传按钮 */}
                    <div className="absolute bottom-2 right-2 z-10 pointer-events-auto">
                      <Button
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-xl backdrop-blur-md text-white border-none shadow-lg active:scale-95 transition-all",
                          isUploaded
                            ? "bg-emerald-500/60"
                            : "bg-black/40 hover:bg-black/60",
                        )}
                        onClick={(e) => handleUpload(e, wp)}
                        title={
                          isUploading
                            ? "上传中"
                            : isUploaded
                              ? "已保存到云端"
                              : "上传壁纸"
                        }
                        disabled={isUploading || isUploaded}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isUploaded ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

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
                      {currentPage} <span className="opacity-30 mx-0.5">/</span>{" "}
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

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent 
          showCloseButton={false}
          className="max-w-none w-auto h-auto p-0 border-none bg-transparent shadow-none gap-0 flex items-center justify-center"
        >
          <DialogTitle className="sr-only">图片预览</DialogTitle>
          {previewUrl && (
            <div className="relative animate-in zoom-in-95 duration-200">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-[98vw] max-h-[98vh] w-auto h-auto object-contain rounded-lg shadow-2xl cursor-zoom-out"
                onClick={() => setPreviewUrl(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
