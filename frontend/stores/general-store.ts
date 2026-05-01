import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { ImageLoadMode } from "@/lib/types";
import { generalSettingsApi } from "@/lib/api";
import { toast } from "sonner";
import { storeKey } from ".";
import { FileTag } from "@shared/types";
import { TelegramWebhookInfo } from "@/lib/api/telegram";

// 设置快照类型（用于对比变更）
export interface SettingsSnapshot {
  dataSaverThreshold: number;
  safeMode: boolean;
  nsfwDetection: boolean;
  imageLoadMode: ImageLoadMode;
  defaultUploadTags: FileTag[];
  enableImageAnalysis: boolean;
}

interface GeneralStoreState {
  dataSaverThreshold: number;
  safeMode: boolean;
  nsfwDetection: boolean;
  imageLoadMode: ImageLoadMode;
  defaultUploadTags: FileTag[];
  enableImageAnalysis: boolean;
  telegramWebhookInfo: TelegramWebhookInfo | null;

  setDataSaverThreshold: (threshold: number) => void;
  setSafeMode: (enabled: boolean) => void;
  setNsfwDetection: (enabled: boolean) => void;
  setImageLoadMode: (mode: ImageLoadMode) => void;
  setDefaultUploadTags: (tags: FileTag[]) => void;
  setEnableImageAnalysis: (enabled: boolean) => void;
  setTelegramWebhookInfo: (info: TelegramWebhookInfo | null) => void;

  fetchSettings: () => Promise<void>;
  syncSettings: (options?: { silent?: boolean }) => Promise<void>;
  getSettingsSnapshot: () => SettingsSnapshot;
  hasSettingsChanged: (snapshot: SettingsSnapshot) => boolean;
}

export const useGeneralSettingsStore = create<GeneralStoreState>()(
  persist(
    (set, get) => ({
      dataSaverThreshold: 5.0,
      safeMode: true,
      nsfwDetection: true,
      imageLoadMode: ImageLoadMode.DataSaver,
      defaultUploadTags: [],
      enableImageAnalysis: true,
      telegramWebhookInfo: null,

      setDataSaverThreshold: (threshold) =>
        set({ dataSaverThreshold: threshold }),
      setSafeMode: (enabled) => set({ safeMode: enabled }),
      setNsfwDetection: (enabled) => set({ nsfwDetection: enabled }),
      setImageLoadMode: (mode) => set({ imageLoadMode: mode }),
      setDefaultUploadTags: (tags) => set({ defaultUploadTags: tags }),
      setEnableImageAnalysis: (enabled) =>
        set({ enableImageAnalysis: enabled }),
      setTelegramWebhookInfo: (info) => set({ telegramWebhookInfo: info }),

      fetchSettings: async () => {
        try {
          const settings = await generalSettingsApi.get();
          if (settings) {
            set({
              dataSaverThreshold: settings.dataSaverThreshold,
              safeMode: settings.safeMode,
              nsfwDetection: settings.nsfwDetection,
              imageLoadMode: settings.imageLoadMode,
              defaultUploadTags: settings.defaultUploadTags || [],
              enableImageAnalysis: settings.enableImageAnalysis !== false,
            });
            toast.success("已从云端恢复数据");
          }
        } catch (error) {
          console.error("Failed to fetch general settings", error);
        }
      },

      syncSettings: async (options) => {
        const {
          dataSaverThreshold,
          safeMode,
          nsfwDetection,
          imageLoadMode,
          defaultUploadTags,
          enableImageAnalysis,
        } = get();
        try {
          await generalSettingsApi.update({
            dataSaverThreshold,
            safeMode,
            nsfwDetection,
            imageLoadMode,
            defaultUploadTags,
            enableImageAnalysis,
          });
          if (!options?.silent) {
            toast.success("设置已保存到云端");
          }
        } catch (error) {
          console.error("Failed to sync general settings", error);
          throw error;
        }
      },

      // 获取当前设置的快照
      getSettingsSnapshot: () => {
        const {
          dataSaverThreshold,
          safeMode,
          nsfwDetection,
          imageLoadMode,
          defaultUploadTags,
          enableImageAnalysis,
        } = get();
        return {
          dataSaverThreshold,
          safeMode,
          nsfwDetection,
          imageLoadMode,
          defaultUploadTags: [...defaultUploadTags],
          enableImageAnalysis,
        };
      },

      // 对比当前设置与快照是否变更
      hasSettingsChanged: (snapshot: SettingsSnapshot) => {
        const current = get();
        return (
          current.dataSaverThreshold !== snapshot.dataSaverThreshold ||
          current.safeMode !== snapshot.safeMode ||
          current.nsfwDetection !== snapshot.nsfwDetection ||
          current.imageLoadMode !== snapshot.imageLoadMode ||
          current.enableImageAnalysis !== snapshot.enableImageAnalysis ||
          JSON.stringify([...current.defaultUploadTags].sort()) !==
            JSON.stringify([...snapshot.defaultUploadTags].sort())
        );
      },
    }),
    {
      name: storeKey.GeneralSettings,
      partialize: (state) => ({
        dataSaverThreshold: state.dataSaverThreshold,
        safeMode: state.safeMode,
        nsfwDetection: state.nsfwDetection,
        imageLoadMode: state.imageLoadMode,
        defaultUploadTags: state.defaultUploadTags,
        enableImageAnalysis: state.enableImageAnalysis,
      }),
    }
  )
);

/**
 * SSR 安全的 general settings hook。
 * 服务端渲染时返回 null，客户端 hydrate 后返回真实 state，
 * 避免 hydration mismatch，同时消除 mounted+useEffect 反模式。
 */
export function useGeneralSettingsStoreClient() {
  return useSyncExternalStore(
    useGeneralSettingsStore.subscribe,
    () => useGeneralSettingsStore.getState(),
    () => null
  );
}
