import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ImageLoadMode } from "@/lib/types"; // Assuming ImageLoadMode is here, checking file-store/ui.ts later if not
import { generalSettingsApi } from "@/lib/api";
import { toast } from "sonner";
import { storeKey } from ".";

interface GeneralStoreState {
  // Settings
  dataSaverThreshold: number;
  safeMode: boolean;
  nsfwDetection: boolean;
  imageLoadMode: ImageLoadMode;

  // Actions
  setDataSaverThreshold: (threshold: number) => void;
  setSafeMode: (enabled: boolean) => void;
  setNsfwDetection: (enabled: boolean) => void;
  setImageLoadMode: (mode: ImageLoadMode) => void;
  
  // Cloud Sync
  fetchSettings: () => Promise<void>;
  syncSettings: () => Promise<void>;
}

export const useGeneralSettingsStore = create<GeneralStoreState>()(
  persist(
    (set, get) => ({
      dataSaverThreshold: 5.0,
      safeMode: true,
      nsfwDetection: true,
      imageLoadMode: ImageLoadMode.DataSaver,

      setDataSaverThreshold: (threshold) => set({ dataSaverThreshold: threshold }),
      setSafeMode: (enabled) => set({ safeMode: enabled }),
      setNsfwDetection: (enabled) => set({ nsfwDetection: enabled }),
      setImageLoadMode: (mode) => set({ imageLoadMode: mode }),

      fetchSettings: async () => {
        try {
          const settings = await generalSettingsApi.get();
          if (settings) {
            set({
              dataSaverThreshold: settings.dataSaverThreshold,
              safeMode: settings.safeMode,
              nsfwDetection: settings.nsfwDetection,
              imageLoadMode: settings.imageLoadMode,
            });
          }
        } catch (error) {
          console.error("Failed to fetch general settings", error);
        }
      },

      syncSettings: async () => {
        const { dataSaverThreshold, safeMode, nsfwDetection, imageLoadMode } = get();
        try {
          await generalSettingsApi.update({
            dataSaverThreshold,
            safeMode,
            nsfwDetection,
            imageLoadMode,
          });
          toast.success("设置已保存到云端");
        } catch (error) {
          console.error("Failed to sync general settings", error);
          throw error;
        }
      },
    }),
    {
      name: storeKey.GeneralSettings,
      partialize: (state) => ({
        dataSaverThreshold: state.dataSaverThreshold,
        safeMode: state.safeMode,
        nsfwDetection: state.nsfwDetection,
        imageLoadMode: state.imageLoadMode,
      }),
    }
  )
);
