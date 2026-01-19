import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getFromStorage, setToStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { getWallpapers } from "@/lib/api";
import {
  WallpaperProvider,
} from "./types";
import { getSourceById, WALLPAPER_SOURCE_LIST } from "./sources";
import { WallpaperSourceId, UnifiedWallpaper } from "@/lib/types";

/**
 * 数据源与配置管理 Hook
 */
export function useWallpaperSources() {
  const [activeSourceId, setActiveSourceId] = useState<WallpaperSourceId>(
    WALLPAPER_SOURCE_LIST[0].id,
  );
  const [configs, setConfigs] = useState<Record<WallpaperSourceId, any>>(() => {
    const allConfigs = getFromStorage<Record<string, any>>(STORAGE_KEYS.WALLPAPER_SETTINGS, {});
    const newConfigs: any = {};
    WALLPAPER_SOURCE_LIST.forEach((source) => {
      newConfigs[source.id] = allConfigs[source.id] || source.defaultConfig;
    });
    return newConfigs;
  });

  const activeSource = getSourceById(activeSourceId);

  const updateConfig = useCallback(
    (sourceId: WallpaperSourceId, newConfig: any) => {
      setConfigs((prev) => {
        const nextConfigs = { ...prev, [sourceId]: newConfig };
        setToStorage(STORAGE_KEYS.WALLPAPER_SETTINGS, nextConfigs);
        return nextConfigs;
      });
    },
    [],
  );

  const hasApiKey = !!(
    activeSource &&
    configs[activeSourceId] &&
    activeSource.getApiKey(configs[activeSourceId])
  );

  return {
    activeSourceId,
    setActiveSourceId,
    configs,
    updateConfig,
    activeSource,
    hasApiKey,
  };
}

/**
 * 壁纸列表与请求管理 Hook
 */
export function useWallpaperList(
  activeSource: WallpaperProvider,
  config: any,
  pagination: { minPage: number; maxPage: number },
) {
  const [wallpapers, setWallpapers] = useState<UnifiedWallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchWallpapers = async () => {
    if (!activeSource || !config) return;

    const apiKey = activeSource.getApiKey(config);
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }

    setLoading(true);
    try {
      const { minPage, maxPage } = pagination;
      const randomPage =
        Math.floor(Math.random() * (maxPage - minPage + 1)) + minPage;

      const data = await getWallpapers(activeSource.id, {
        ...config,
        page: randomPage,
      });

      if (data.length === 0) {
        toast.info("未找到更多壁纸");
      } else {
        setWallpapers((prev) => {
          const existingKeys = new Set(
            prev.map((wp) => `${wp.source}-${wp.id}`),
          );
          const newUnique = data.filter(
            (wp: UnifiedWallpaper) => !existingKeys.has(`${wp.source}-${wp.id}`),
          );
          return [...newUnique, ...prev];
        });
        setCurrentPage(1);
        toast.success(
          `成功从 ${activeSource.name} 获取 ${data.length} 张壁纸 (第 ${randomPage} 页)`,
        );
      }
    } catch (error: any) {
      if (error.message !== "API_KEY_MISSING") {
        toast.error(error.message || "获取失败");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearList = useCallback(() => {
    setWallpapers([]);
    setCurrentPage(1);
  }, []);

  return {
    wallpapers,
    loading,
    currentPage,
    setCurrentPage,
    fetchWallpapers,
    clearList,
  };
}
