import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useFileDataStore } from "./data";
import { ViewMode, SortType, SortOrder } from "@/lib/types";
import { FileType } from "@shared/types";
import { storeKey } from "..";

interface FileUIState {
  viewMode: ViewMode;
  itemsPerPage: number;
  currentPage: number;
  sortType: SortType;
  sortOrder: SortOrder;
  fabPosition: { x: number; y: number };

  // selection 按桶管理
  selectedKeys: Record<FileType, string[]>;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setItemsPerPage: (count: number) => void;
  setCurrentPage: (page: number) => void;
  setSortType: (type: SortType) => void;
  setSortOrder: (order: SortOrder) => void;
  setFabPosition: (position: { x: number; y: number }) => void;

  toggleSelection: (name: string, type?: FileType) => void;
  selectAll: (names?: string[], type?: FileType) => void;
  clearSelection: (type?: FileType) => void;
}

export const useFileUIStore = create<FileUIState>()(
  persist(
    (set, get) => ({
      viewMode: ViewMode.Grid,
      itemsPerPage: 20,
      currentPage: 0,
      sortType: SortType.UploadedAt,
      sortOrder: SortOrder.Desc,
      fabPosition: { x: 32, y: 32 },

      selectedKeys: {
        [FileType.Image]: [],
        [FileType.Audio]: [],
        [FileType.Video]: [],
        [FileType.Document]: [],
        [FileType.Trash]: [],
      },

      setViewMode: (mode) => {
        set({ viewMode: mode, currentPage: 0 }); // 切换视图模式时重置页码
      },

      setItemsPerPage: (count) => {
        set({ itemsPerPage: count, currentPage: 0 }); // 更改每页数量时重置页码
      },

      setCurrentPage: (page) => set({ currentPage: page }),

      setSortType: (type) => set({ sortType: type }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setFabPosition: (position) => set({ fabPosition: position }),

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
    }),
    {
      name: storeKey.FileUI,
      partialize: (state) => ({
        viewMode: state.viewMode,
        itemsPerPage: state.itemsPerPage,
        sortType: state.sortType,
        sortOrder: state.sortOrder,
        fabPosition: state.fabPosition,
      }),
    }
  )
);

export const useActiveSelectedKeys = () => {
  const activeType = useFileDataStore((s) => s.activeType);
  const selectedKeys = useFileUIStore((s) => s.selectedKeys);
  return selectedKeys[activeType] || [];
};
