import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WallpaperSourceId, WallpaperConfigs, WallpaperConfigMap } from "@shared/types";
import { wallpaperConfigsApi } from "@/lib/api";
import { toast } from "sonner";
import { WALLPAPER_SOURCE_LIST } from "@/components/settings/wallpaper-tab/sources";
import { WP_API_KEY_PLACEHOLDER } from "@/components/settings/wallpaper-tab/types";
import { storeKey } from ".";

interface WallpaperStoreState {
  activeSourceId: WallpaperSourceId;
  configs: WallpaperConfigs;

  setActiveSourceId: (id: WallpaperSourceId) => void;
  updateConfig: <K extends WallpaperSourceId>(sourceId: K, config: WallpaperConfigMap[K]) => void;
  
  // Cloud Sync
  fetchConfigsFromCloud: () => Promise<void>;
  syncConfigToCloud: () => Promise<void>;
}

export const useWallpaperStore = create<WallpaperStoreState>()(
  persist(
    (set, get) => ({
      activeSourceId: WallpaperSourceId.Wallhaven, // Default, or should be from list
      configs: {},

      setActiveSourceId: (id) => set({ activeSourceId: id }),

      updateConfig: (sourceId, config) =>
        set((state) => ({
          configs: { ...state.configs, [sourceId]: config },
        })),

      fetchConfigsFromCloud: async () => {
        try {
          const cloudConfigs = await wallpaperConfigsApi.get();
          if (cloudConfigs) {
             const currentConfigs = get().configs;
             const nextConfigs = { ...currentConfigs };
             let hasChanges = false;

             WALLPAPER_SOURCE_LIST.forEach((source) => {
                const cloudConfig = cloudConfigs[source.id];
                if (!cloudConfig || !('apiKey' in cloudConfig) || !cloudConfig.apiKey) return;

                const current = nextConfigs[source.id] ?? source.defaultConfig;
                
                const updatedConfig = (source as any).setApiKey(current, cloudConfig.apiKey);
                
                nextConfigs[source.id] = updatedConfig;
                hasChanges = true;
             });

             if (hasChanges) {
                set({ configs: nextConfigs });
                toast.success("已从云端同步壁纸配置");
             }
          }
        } catch (error) {
          console.error("Failed to fetch wallpaper settings", error);
        }
      },

      syncConfigToCloud: async () => {
        const { configs } = get();
        // Use Partial<WallpaperConfigMap> instead of Record<string, any>
        const wallpaperCloudSettings: Partial<WallpaperConfigMap> = {};
        
        WALLPAPER_SOURCE_LIST.forEach((source) => {
            const config = configs[source.id];
            if (!config) return;
            const apiKey = (source as any).getApiKey(config);
            
            if (apiKey && apiKey !== WP_API_KEY_PLACEHOLDER) {
                 wallpaperCloudSettings[source.id] = { apiKey } as any; 
            }
        });

        if (Object.keys(wallpaperCloudSettings).length > 0) {
            await wallpaperConfigsApi.update(wallpaperCloudSettings); 
        }
      },
    }),
    {
      name: storeKey.WallpaperConfigs,
      onRehydrateStorage: () => (state) => {
        // Initialize default configs if missing
        if (state) {
            const newConfigs = { ...state.configs };
            let changed = false;
            WALLPAPER_SOURCE_LIST.forEach(source => {
                if (!newConfigs[source.id]) {
                    newConfigs[source.id] = (source as any).defaultConfig;
                    changed = true;
                }
            });
            if (changed) {
                state.configs = newConfigs;
            }
        }
      }
    }
  )
);

