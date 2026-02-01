import { create } from "zustand";
import { useFileDataStore } from "./data";
import { setToStorage, STORAGE_KEYS } from "../local-storage";
import { ViewMode, ImageLoadMode } from "../types";
import { FileType } from "@shared/types";

import { updateSettings } from "@/lib/api";

interface FileUIState {
  viewMode: ViewMode;
  safeMode: boolean;
  imageLoadMode: ImageLoadMode;
  dataSaverThreshold: number; // MB
  nsfwDetection: boolean;
  itemsPerPage: number;
  currentPage: number;
  
  // selection 按桶管理
  selectedKeys: Record<FileType, string[]>;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSafeMode: (enabled: boolean) => void;
  setImageLoadMode: (mode: ImageLoadMode) => void;
  setDataSaverThreshold: (threshold: number) => void;
  setNsfwDetection: (enabled: boolean) => void;
  setItemsPerPage: (count: number) => void;
  setCurrentPage: (page: number) => void;
  
  // 云端同步
  syncGeneralSettings: () => Promise<void>;
  
  toggleSelection: (name: string, type?: FileType) => void;
  selectAll: (names?: string[], type?: FileType) => void;
  clearSelection: (type?: FileType) => void;
}

export const useFileUIStore = create<FileUIState>((set, get) => ({
  viewMode: ViewMode.Grid,
  safeMode: true,
  imageLoadMode: ImageLoadMode.DataSaver,
  dataSaverThreshold: 5.0,
  nsfwDetection: true,
  itemsPerPage: 20,
  currentPage: 0,
  
  selectedKeys: {
    [FileType.Image]: [],
    [FileType.Audio]: [],
    [FileType.Video]: [],
    [FileType.Document]: [],
    [FileType.Trash]: [],
  },

  setViewMode: (mode) => {
    set({ viewMode: mode, currentPage: 0 }); // 切换视图模式时重置页码
    setToStorage(STORAGE_KEYS.VIEW_MODE, mode);
  },

  setSafeMode: (enabled) => {
    set({ safeMode: enabled });
    setToStorage(STORAGE_KEYS.SAFE_MODE, enabled);
  },

  setImageLoadMode: (mode) => {
    set({ imageLoadMode: mode });
    setToStorage(STORAGE_KEYS.IMAGE_LOAD_MODE, mode);
  },

  setDataSaverThreshold: (threshold) => {
    set({ dataSaverThreshold: threshold });
    setToStorage(STORAGE_KEYS.DATA_SAVER_THRESHOLD, threshold);
  },

  setNsfwDetection: (enabled) => {
    set({ nsfwDetection: enabled });
    setToStorage(STORAGE_KEYS.NSFW_DETECTION, enabled);
  },

  setItemsPerPage: (count) => {
    set({ itemsPerPage: count, currentPage: 0 }); // 更改每页数量时重置页码
    setToStorage(STORAGE_KEYS.ITEMS_PER_PAGE, count);
  },

  setCurrentPage: (page) => set({ currentPage: page }),

  syncGeneralSettings: async () => {
    const { dataSaverThreshold, nsfwDetection } = get();
    await updateSettings({
      general: {
        dataSaverThreshold,
        nsfwDetection,
      },
    });
  },

  toggleSelection: (name, type) =>
    set((state) => {
      const currentType = type ?? useFileDataStore.getState().activeType;
      const current = state.selectedKeys[currentType] || [];
      const isSelected = current.includes(name);
      return {
        selectedKeys: {
          ...state.selectedKeys,
          [currentType]: isSelected
            ? current.filter((key) => key !== name)
            : [...current, name],
        },
      };
    }),

  selectAll: (names, type) =>
    set((state) => {
      const currentType = type ?? useFileDataStore.getState().activeType;
      const keys = names ?? useFileDataStore.getState().buckets[currentType].items.map(i => i.name);
      return {
        selectedKeys: {
          ...state.selectedKeys,
          [currentType]: keys,
        },
      };
    }),

  clearSelection: (type) =>
    set((state) => {
      const currentType = type ?? useFileDataStore.getState().activeType;
      return {
        selectedKeys: {
          ...state.selectedKeys,
          [currentType]: [],
        },
      };
    }),
}));

export const useActiveSelectedKeys = () => {
  const activeType = useFileDataStore((s) => s.activeType);
  const selectedKeys = useFileUIStore((s) => s.selectedKeys);
  return selectedKeys[activeType] || [];
};

