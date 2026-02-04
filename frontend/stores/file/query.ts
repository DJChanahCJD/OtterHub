import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SortType, SortOrder } from "@/lib/types";
import { useMemo } from "react";
import { useActiveItems } from "./data";
import { storeKey } from "..";

interface FileQueryState {
  searchQuery: string;
  filterLiked: boolean;
  filterTags: string[];
  filterDateRange: { start?: number; end?: number };
  sortType: SortType;
  sortOrder: SortOrder;

  // Actions
  setSearchQuery: (query: string) => void;
  setFilterLiked: (liked: boolean) => void;
  setFilterTags: (tags: string[]) => void;
  setFilterDateRange: (range: { start?: number; end?: number }) => void;
  setSortType: (type: SortType) => void;
  setSortOrder: (order: SortOrder) => void;
  resetFilters: () => void;
}

export const useFileQueryStore = create<FileQueryState>()(
  persist(
    (set) => ({
      searchQuery: "",
      filterLiked: false,
      filterTags: [],
      filterDateRange: {},
      sortType: SortType.UploadedAt,
      sortOrder: SortOrder.Desc,

      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setFilterLiked: (liked) => set({ filterLiked: liked }),

      setFilterTags: (tags) => set({ filterTags: tags }),

      setFilterDateRange: (range) => set({ filterDateRange: range }),

      setSortType: (type) => {
        set({ sortType: type });
      },

      setSortOrder: (order) => {
        set({ sortOrder: order });
      },

      resetFilters: () => set({
        filterLiked: false,
        filterTags: [],
        filterDateRange: {},
        searchQuery: "",
      }),
    }),
    {
      name: storeKey.FileQuery,
      partialize: (state) => ({
        sortType: state.sortType,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

export const useAvailableTags = () => {
  const items = useActiveItems();
  return useMemo(() => {
    const tags = new Set<string>();
    items.forEach((item) => {
      if (item.metadata?.tags) {
        (item.metadata.tags as string[]).forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [items]);
};

export const useFilteredFiles = () => {
  const { searchQuery, sortType, sortOrder, filterLiked, filterTags, filterDateRange } = useFileQueryStore();
  const items = useActiveItems();

  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (query) {
        const name = item.metadata?.fileName?.toLowerCase() ?? item.name.toLowerCase();
        const matchesName = name.includes(query) || (query.length >= 3 && item.name.toLowerCase().includes(query));
        if (!matchesName) return false;
      }
      // 收藏过滤
      if (filterLiked && !item.metadata?.liked) return false;

      // 标签过滤
      if (filterTags.length > 0) {
        const itemTags = (item.metadata?.tags || []) as string[];
        if (!filterTags.every(tag => itemTags.includes(tag))) return false;
      }
      // 日期筛选
      if (filterDateRange.start || filterDateRange.end) {
        const uploadedAt = item.metadata?.uploadedAt || 0;
        if (filterDateRange.start && uploadedAt < filterDateRange.start) return false;
        if (filterDateRange.end && uploadedAt > filterDateRange.end) return false;
      }

      return true;
    });

    return filtered.slice().sort((a, b) => {
      let diff = 0;
      switch (sortType) {
        case SortType.Name: {
          const nameA = a.metadata?.fileName?.toLowerCase() ?? a.name.toLowerCase();
          const nameB = b.metadata?.fileName?.toLowerCase() ?? b.name.toLowerCase();
          diff = nameA.localeCompare(nameB);
          break;
        }
        case SortType.UploadedAt:
          diff = (a.metadata?.uploadedAt ?? 0) - (b.metadata?.uploadedAt ?? 0);
          break;
        case SortType.FileSize:
          diff = (a.metadata?.fileSize ?? 0) - (b.metadata?.fileSize ?? 0);
          break;
      }
      return sortOrder === SortOrder.Asc ? diff : -diff;
    });
  }, [items, searchQuery, sortType, sortOrder, filterLiked, filterTags, filterDateRange]);
};
