import { create } from "zustand";
import { useFileDataStore } from "./data";
import { setToStorage, STORAGE_KEYS } from "../local-storage";
import { ViewMode, ImageLoadMode, FileType } from "../types";

interface FileUIState {
  viewMode: ViewMode;
  safeMode: boolean;
  imageLoadMode: ImageLoadMode;
  itemsPerPage: number;
  
  // selection 按桶管理
  selectedKeys: Record<FileType, string[]>;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSafeMode: (enabled: boolean) => void;
  setImageLoadMode: (mode: ImageLoadMode) => void;
  setItemsPerPage: (count: number) => void;
  
  toggleSelection: (name: string, type?: FileType) => void;
  selectAll: (names?: string[], type?: FileType) => void;
  clearSelection: (type?: FileType) => void;
}

export const useFileUIStore = create<FileUIState>((set, get) => ({
  viewMode: ViewMode.Grid,
  safeMode: true,
  imageLoadMode: ImageLoadMode.DataSaver,
  itemsPerPage: 20,
  
  selectedKeys: {
    [FileType.Image]: [],
    [FileType.Audio]: [],
    [FileType.Video]: [],
    [FileType.Document]: [],
    [FileType.Trash]: [],
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
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

  setItemsPerPage: (count) => {
    set({ itemsPerPage: count });
    setToStorage(STORAGE_KEYS.ITEMS_PER_PAGE, count);
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

