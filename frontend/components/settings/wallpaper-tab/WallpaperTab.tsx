"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, RefreshCw, Download, Loader2, Key, Sliders, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFromStorage, setToStorage } from "@/lib/local-storage";
import { toast } from "sonner";
import { UnifiedWallpaper } from "./types";
import { WALLPAPER_SOURCES, getSourceById } from "./sources";
import { getWallpapers, uploadByUrl } from "@/lib/api";

export function WallpaperTab() {
  const [activeSourceId, setActiveSourceId] = useState<string>(WALLPAPER_SOURCES[0].id);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  
  const [wallpapers, setWallpapers] = useState<UnifiedWallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | number | null>(null);

  const activeSource = getSourceById(activeSourceId);

  // 初始化加载所有配置
  useEffect(() => {
    const newConfigs: Record<string, any> = {};
    WALLPAPER_SOURCES.forEach(source => {
      const saved = getFromStorage(source.storageKey, null);
      newConfigs[source.id] = saved || source.defaultConfig;
    });
    setConfigs(newConfigs);
  }, []);

  // 配置变更处理
  const handleConfigChange = (sourceId: string, newConfig: any) => {
    setConfigs(prev => ({ ...prev, [sourceId]: newConfig }));
    const source = getSourceById(sourceId);
    if (source) {
      setToStorage(source.storageKey, newConfig);
    }
  };

  const fetchWallpapers = async () => {
    if (!activeSource) return;
    
    const config = configs[activeSourceId];
    if (!config) return;

    const apiKey = activeSource.getApiKey(config);
    
    // 兼容现有逻辑：Pixabay 必须 Key
    if (activeSourceId === 'pixabay' && !apiKey) {
      toast.error(`${activeSource.name} 需要 API Key`);
      return;
    }

    setLoading(true);
    try {
      const data = await getWallpapers(activeSourceId, config);
      setWallpapers(data);
    } catch (error: any) {
      toast.error(error.message || "获取失败");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (wp: UnifiedWallpaper) => {
    if (!activeSource) return;
    const config = configs[activeSourceId];

    setUploadingId(wp.id);
    try {
      const fileName = `${wp.source}_${wp.id}.jpg`;
      const isNsfw = activeSource.isNsfw(config);
      
      await uploadByUrl(wp.rawUrl, fileName, isNsfw);
      toast.success("已保存到云端");
    } catch (error: any) {
      toast.error(error.message || "上传失败");
    } finally {
      setUploadingId(null);
    }
  };

  if (!activeSource) return null;

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      {/* 顶部数据源选择 */}
      <div className="flex items-center justify-between">
        <Tabs value={activeSourceId} onValueChange={setActiveSourceId} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            {WALLPAPER_SOURCES.map(source => (
              <TabsTrigger key={source.id} value={source.id} className="gap-2">
                <source.icon className="h-4 w-4" /> {source.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2">
          <Button onClick={fetchWallpapers} disabled={loading} className="h-9 gap-2 px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            刷新壁纸
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* 左侧配置栏 */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <section className="space-y-3">
             <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Sliders className="h-4 w-4" /> 配置参数
            </div>
            
            {/* 动态渲染当前源的配置面板 */}
            {configs[activeSourceId] && (
              <activeSource.ConfigPanel 
                config={configs[activeSourceId]} 
                onChange={(newConfig) => handleConfigChange(activeSourceId, newConfig)} 
              />
            )}
          </section>

          <div className="pt-4 border-t border-border">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <p>所有配置参数均保存在您的本地浏览器中，不会上传到服务器。</p>
            </div>
          </div>
        </div>

        {/* 右侧展示区 */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {wallpapers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 space-y-4">
                <ImageIcon className="h-16 w-16" />
                <p className="text-lg font-medium">配置参数后开始探索壁纸</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {wallpapers.map((wp) => (
                  <div key={wp.id} className="group relative aspect-[3/2] rounded-xl overflow-hidden border border-border bg-muted shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5">
                    <img 
                      src={wp.previewUrl} 
                      alt={wp.source} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/70 truncate capitalize">{wp.source}</p>
                        </div>
                        <Button 
                          size="icon" 
                          className="h-9 w-9 rounded-full shadow-2xl bg-primary hover:bg-primary/90"
                          onClick={() => handleUpload(wp)}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
