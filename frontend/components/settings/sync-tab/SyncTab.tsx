"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  CloudUpload,
  CloudDownload,
  Music,
  Info,
  Laptop,
  Cloud,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

import { useMusicStore } from "@/stores/music-store";
import { musicStoreApi } from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PendingAction = "upload" | "download" | null;

export function SyncTab() {
  /* -------------------- 状态 -------------------- */

  const [isSyncingMusic, setIsSyncingMusic] = useState(false);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);

  const [cloudData, setCloudData] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const isBusy = isSyncingMusic || isUploadingMusic;

  /* -------------------- 本地数据 -------------------- */

  const favorites = useMusicStore((state) => state.favorites);
  const playlists = useMusicStore((state) => state.playlists);

  const localCount = useMemo(
    () => ({
      favorites: favorites.length,
      playlists: playlists.length,
    }),
    [favorites, playlists],
  );

  const cloudCount = useMemo(
    () => ({
      favorites: cloudData?.favorites?.length ?? 0,
      playlists: cloudData?.playlists?.length ?? 0,
    }),
    [cloudData],
  );

  /* -------------------- 获取云端 -------------------- */

  const fetchCloudData = async (silent = false) => {
    setIsCheckingCloud(true);
    try {
      const data = await musicStoreApi.get();
      setCloudData(data && Object.keys(data).length > 0 ? data : null);
    } catch (error) {
      console.error("Failed to fetch cloud data", error);
      if (!silent) toast.error("获取云端数据失败");
    } finally {
      setIsCheckingCloud(false);
    }
  };

  useEffect(() => {
    fetchCloudData(true);
  }, []);

  /* -------------------- 执行上传 -------------------- */

  const executeUpload = async () => {
    setIsUploadingMusic(true);
    try {
      const state = useMusicStore.getState();

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
      setCloudData(dataToSync);
      toast.success("已备份到云端");
    } catch (error: any) {
      toast.error("备份失败: " + error.message);
    } finally {
      setIsUploadingMusic(false);
      setPendingAction(null);
    }
  };

  /* -------------------- 执行下载 -------------------- */

  const executeDownload = async () => {
    setIsSyncingMusic(true);
    try {
      const data = await musicStoreApi.get();

      if (!data || Object.keys(data).length === 0) {
        toast.info("云端暂无数据");
        return;
      }

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

      setCloudData(data);
      toast.success("已从云端恢复");
    } catch (error: any) {
      toast.error("恢复失败: " + error.message);
    } finally {
      setIsSyncingMusic(false);
      setPendingAction(null);
    }
  };

  /* -------------------- 确认执行 -------------------- */

  const confirmAction = () => {
    if (pendingAction === "upload") executeUpload();
    if (pendingAction === "download") executeDownload();
  };

  /* -------------------- UI -------------------- */

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 pr-2">
      {/* 标题 */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold">云端同步</h2>
          <p className="text-sm text-muted-foreground">管理云端备份</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchCloudData()}
          disabled={isCheckingCloud || isBusy}
        >
          <RefreshCw
            className={cn("h-4 w-4", isCheckingCloud && "animate-spin")}
          />
        </Button>
      </div>

      <Separator />

      {/* 卡片 */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-pink-500" />
            <CardTitle className="text-base">音乐数据</CardTitle>
          </div>
          <CardDescription>同步歌单与喜欢</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col space-y-4">
            {/* Data Comparison Grid */}
            <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden text-sm">
              {/* Header */}
              <div className="grid grid-cols-3 bg-muted/30 p-3 border-b border-border/40">
                <div className="text-muted-foreground font-medium flex items-center">
                  数据对比
                </div>
                <div className="font-medium flex items-center gap-1.5 text-primary">
                  <Laptop className="w-3.5 h-3.5" /> 本地
                </div>
                <div className="font-medium flex items-center gap-1.5 text-sky-500">
                  <Cloud className="w-3.5 h-3.5" /> 云端（
                  {cloudData
                    ? format(cloudData.updatedAt, "yyyy-MM-dd HH:mm")
                    : "无备份"}
                  ）
                </div>
              </div>

              {/* Rows */}
              <div className="p-3 grid gap-3">
                {/* TODO: 详情比较 */}
                <div className="grid grid-cols-3 items-center">
                  <span className="text-muted-foreground">喜欢歌曲</span>
                  <span className="font-medium">{localCount.favorites} 首</span>
                  <span
                    className={cn(
                      "font-medium",
                      !cloudData && "text-muted-foreground/50",
                    )}
                  >
                    {cloudData ? `${cloudCount.favorites} 首` : "-"}
                  </span>
                </div>

                <div className="grid grid-cols-3 items-center">
                  <span className="text-muted-foreground">自建歌单</span>
                  <span className="font-medium">{localCount.playlists} 个</span>
                  <span
                    className={cn(
                      "font-medium",
                      !cloudData && "text-muted-foreground/50",
                    )}
                  >
                    {cloudData ? `${cloudCount.playlists} 个` : "-"}
                  </span>
                </div>
              </div>
            </div>
            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-500/10"
                disabled={isBusy}
                onClick={() => setPendingAction("download")}
              >
                <CloudDownload className="h-4 w-4 mr-2" />
                从云端恢复
              </Button>

              <Button
                className="flex-1 bg-linear-to-r from-pink-500 to-rose-500 text-white"
                disabled={isBusy}
                onClick={() => setPendingAction("upload")}
              >
                <CloudUpload className="h-4 w-4 mr-2" />
                备份到云端
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex gap-1">
              <Info className="h-3 w-3 mt-0.5" />
              恢复将覆盖本地数据
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 确认弹窗 */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={() => setPendingAction(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              确认操作
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm space-y-2">
            {pendingAction === "upload" && <p>将使用 本地数据 覆盖 云端数据</p>}
            {pendingAction === "download" && (
              <p>将使用 云端数据 覆盖 本地数据</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAction}
              disabled={isBusy}
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
