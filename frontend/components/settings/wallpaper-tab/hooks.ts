import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getFromStorage, setToStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { getWallpapers, getSettings, updateSettings } from "@/lib/api";
import {
  WP_API_KEY_PLACEHOLDER,
  WallpaperProvider,
} from "./types";
import { getSourceById, WALLPAPER_SOURCE_LIST } from "./sources";
import { WallpaperSourceId, UnifiedWallpaper, AppSettings, WallpaperCloudConfig } from "@/lib/types";

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

  // 从云端同步 API Key 的逻辑
  const handleFetchFromCloud = useCallback(async () => {
    try {
      const { nextConfigs, hasChanges } = await fetchWallpaperApiKeyFromCloud(configs);
      if (hasChanges) {
        setConfigs(nextConfigs);
        setToStorage(STORAGE_KEYS.WALLPAPER_SETTINGS, nextConfigs);
        toast.success("已从云端同步壁纸配置");
      }
    } catch (error) {
      // 忽略未登录或获取失败的情况
    }
  }, [configs]);

  // 同步当前 API Key 到云端
  const handleSyncToCloud = useCallback(async (currentConfigs?: Record<WallpaperSourceId, any>) => {
    try {
      await syncWallpaperApiKeyToCloud(currentConfigs || configs);
    } catch (error) {
      console.error("同步 API Key 到云端失败:", error);
      throw error;
    }
  }, [configs]);

  // 初始化时：如果本地没有数据，尝试从云端同步
  useEffect(() => {
    const localData = window.localStorage.getItem(STORAGE_KEYS.WALLPAPER_SETTINGS);
    if (!localData || localData === "{}") {
      handleFetchFromCloud();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSource = getSourceById(activeSourceId);

  // 仅更新本地配置和存储
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
    syncToCloud: handleSyncToCloud,
    fetchFromCloud: handleFetchFromCloud,
  };
}

/**
 * 从云端获取 API Key 并合并到当前配置中
 */
export async function fetchWallpaperApiKeyFromCloud(
  currentConfigs: Record<WallpaperSourceId, any>
): Promise<{
  nextConfigs: Record<WallpaperSourceId, any>;
  hasChanges: boolean;
}> {
  const settings = await getSettings();
  if (!settings?.wallpaper) return { nextConfigs: currentConfigs, hasChanges: false };

  const cloudSettings = settings.wallpaper;
  const nextConfigs = { ...currentConfigs };
  let hasChanges = false;

  WALLPAPER_SOURCE_LIST.forEach((source) => {
    const cloudConfig = cloudSettings[source.id];
    if (cloudConfig?.apiKey) {
      const updatedConfig = source.setApiKey(
        nextConfigs[source.id] || source.defaultConfig,
        cloudConfig.apiKey
      );
      nextConfigs[source.id] = updatedConfig;
      hasChanges = true;
    }
  });

  return { nextConfigs, hasChanges };
}

/**
 * 将当前配置中的 API Key 同步到云端
 */
export async function syncWallpaperApiKeyToCloud(
  configs: Record<WallpaperSourceId, any>
) {
  const wallpaperCloudSettings: Record<string, WallpaperCloudConfig> = {};
  
  WALLPAPER_SOURCE_LIST.forEach((source) => {
    const config = configs[source.id];
    if (!config) return;
    
    const apiKey = source.getApiKey(config);
    if (apiKey && apiKey !== WP_API_KEY_PLACEHOLDER) {
      wallpaperCloudSettings[source.id] = { apiKey };
    }
  });

  if (Object.keys(wallpaperCloudSettings).length > 0) {
    await updateSettings({ wallpaper: wallpaperCloudSettings });
  }
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
