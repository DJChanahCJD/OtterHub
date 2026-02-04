"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CloudUpload,
  CloudDownload,
  Music,
  Info,
  Laptop,
  Cloud,
  ArrowRightLeft,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMusicStore } from "@/stores/music-store";
import { musicStoreApi } from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import {format} from "date-fns"

export function SyncTab() {
  const [isSyncingMusic, setIsSyncingMusic] = useState(false);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [cloudData, setCloudData] = useState<any>(null);

  // Access music store
  const favorites = useMusicStore((state) => state.favorites);
  const playlists = useMusicStore((state) => state.playlists);

  // Fetch Cloud Data
  const fetchCloudData = async (silent = false) => {
    setIsCheckingCloud(true);
    try {
      const data = await musicStoreApi.get();
      setCloudData(data && Object.keys(data).length > 0 ? data : null);
      if (!silent && data && Object.keys(data).length > 0) {
        // toast.success("已获取云端最新数据");
      }
    } catch (error) {
      console.error("Failed to fetch cloud data", error);
      if (!silent) {
        // toast.error("获取云端数据失败");
      }
    } finally {
      setIsCheckingCloud(false);
    }
  };

  useEffect(() => {
    fetchCloudData(true);
  }, []);

  // Upload Music Data
  const handleUploadMusic = async () => {
    if (cloudData.favorites.length + cloudData.playlists.length > favorites.length + playlists.length) {
      if (!confirm("云端数据比本地数据多，是否确认上传？")) {
        return;
      }
    }
    setIsUploadingMusic(true);
    try {
      const state = useMusicStore.getState();
      // TODO: 创建一个type来定义dataToSync的结构
      const dataToSync = {
        favorites: state.favorites,
        playlists: state.playlists,
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        isRepeat: state.isRepeat,
        isShuffle: state.isShuffle,
        quality: state.quality,
        searchSource: state.searchSource,
        updatedAt: Date.now(),
      };

      await musicStoreApi.update(dataToSync);
      toast.success("音乐数据已成功备份到云端");
      // Refresh cloud data display
      setCloudData(dataToSync);
    } catch (error: any) {
      toast.error("备份失败: " + error.message);
    } finally {
      setIsUploadingMusic(false);
    }
  };

  // Download Music Data
  const handleDownloadMusic = async () => {
    setIsSyncingMusic(true);
    try {
      const data = await musicStoreApi.get();
      
      if (data && Object.keys(data).length > 0) {
        useMusicStore.setState({
            favorites: data.favorites || [],
            playlists: data.playlists || [],
            queue: data.queue || [],
            currentIndex: data.currentIndex || 0,
            volume: data.volume,
            isRepeat: data.isRepeat,
            isShuffle: data.isShuffle,
            quality: data.quality || "320",
            searchSource: data.searchSource || "netease",
        });
        toast.success("已从云端恢复音乐数据");
        setCloudData(data); // Update cloud display
      } else {
        toast.info("云端暂无音乐数据");
      }
    } catch (error: any) {
      toast.error("恢复失败: " + error.message);
    } finally {
      setIsSyncingMusic(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar space-y-6 pr-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight">云端同步</h2>
          <p className="text-sm text-muted-foreground">管理您的云端数据备份</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => fetchCloudData()} 
          disabled={isCheckingCloud}
          className="h-8 w-8 rounded-full"
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isCheckingCloud && "animate-spin")} />
        </Button>
      </div>

      <Separator className="opacity-50" />

      <div className="grid gap-6">
        {/* Music Sync Card */}
        <Card className="border border-border/40 shadow-sm bg-muted/10 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Music className="h-4 w-4 text-pink-500" />
              <CardTitle className="text-base">音乐数据</CardTitle>
            </div>
            <CardDescription>同步您的歌单、收藏和播放偏好</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col space-y-4">
                
                {/* Data Comparison Grid */}
                <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden text-sm">
                  {/* Header */}
                  <div className="grid grid-cols-3 bg-muted/30 p-3 border-b border-border/40">
                    <div className="text-muted-foreground font-medium flex items-center">数据对比</div>
                    <div className="font-medium flex items-center gap-1.5 text-primary">
                      <Laptop className="w-3.5 h-3.5" /> 本地
                    </div>
                    <div className="font-medium flex items-center gap-1.5 text-sky-500">
                      <Cloud className="w-3.5 h-3.5" /> 云端（{cloudData ? format(cloudData.updatedAt, "yyyy-MM-dd HH:mm") : "无备份"}）
                    </div>
                  </div>
                  
                  {/* Rows */}
                  <div className="p-3 grid gap-3">
                    {/* TODO: 详情比较 */}
                    <div className="grid grid-cols-3 items-center">
                      <span className="text-muted-foreground">收藏歌曲</span>
                      <span className="font-medium">{favorites.length} 首</span>
                      <span className={cn("font-medium", !cloudData && "text-muted-foreground/50")}>
                         {cloudData ? `${cloudData.favorites?.length || 0} 首` : "-"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 items-center">
                      <span className="text-muted-foreground">自建歌单</span>
                      <span className="font-medium">{playlists.length} 个</span>
                      <span className={cn("font-medium", !cloudData && "text-muted-foreground/50")}>
                         {cloudData ? `${cloudData.playlists?.length || 0} 个` : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                     <Button
                        variant="outline"
                        onClick={handleDownloadMusic}
                        disabled={isSyncingMusic}
                        className="flex-1 rounded-xl h-10 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/30 transition-colors"
                    >
                        <CloudDownload className={cn("h-4 w-4 mr-2", isSyncingMusic && "animate-spin")} />
                        从云端恢复
                    </Button>
                    <Button
                        onClick={handleUploadMusic}
                        disabled={isUploadingMusic}
                        className="flex-1 rounded-xl h-10 shadow-sm bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
                    >
                        <CloudUpload className={cn("h-4 w-4 mr-2", isUploadingMusic && "animate-spin")} />
                        备份到云端
                    </Button>
                </div>

                 <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5 bg-muted/30 p-2 rounded-lg border border-border/20">
                    <Info className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                    云端数据将覆盖本地数据，请谨慎操作。建议在多端切换时使用。
                  </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
