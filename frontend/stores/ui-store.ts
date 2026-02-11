import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storeKey } from ".";
import { SettingTab } from "@/lib/types/settings";

interface SettingsUIState {
  activeSettingTab: string;
  setActiveSettingTab: (tab: string) => void;
}

// TODO: 
export const useUIStore = create<SettingsUIState>()(
  persist(
    (set) => ({
      activeSettingTab: SettingTab.General,
      setActiveSettingTab: (tab) => set({ activeSettingTab: tab }),
    }),
    {
      name: storeKey.UIStore,
    }
  )
);