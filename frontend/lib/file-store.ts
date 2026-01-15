// file-store.ts
import { create } from "zustand";
import {
  FileItem,
  FileMetadata,
  FileType,
  ListFilesRequest,
  ViewMode,
  SortType,
  SortOrder,
  ImageLoadMode,
} from "./types";
import { deleteFile, getFileList } from "./api";
import { STORAGE_KEYS, getFromStorage, setToStorage } from "./local-storage";
import { useMemo } from "react";

type FileBucket = {
  items: FileItem[];
  cursor?: string;
  hasMore: boolean;
  loading: boolean;
};

/**
 * 按文件名合并本地和服务端文件列表
 * @param local 本地文件列表（乐观更新）
 * @param remote 服务端文件列表（权威数据）
 * @returns 合并后的文件列表
 */
function mergeByName(local: FileItem[], remote: FileItem[]): FileItem[] {
  const map = new Map<string, FileItem>();

  // 1. 先放本地（乐观）
  for (const item of local) {
    map.set(item.name, item);
  }

  // 2. 再放服务端（权威，覆盖本地）
  for (const item of remote) {
    map.set(item.name, item);
  }

  return Array.from(map.values());
}

interface FileStore {
  activeType: FileType;
  viewMode: ViewMode;
  searchQuery: string;
  sortType: SortType;
  sortOrder: SortOrder;
  safeMode: boolean; // 安全浏览模式
  imageLoadMode: ImageLoadMode; // 图片加载模式
  itemsPerPage: number; // 每页显示数量

  // 按前缀分桶
  buckets: Record<FileType, FileBucket>;

  // selection 按桶管理
  selectedKeys: Record<FileType, string[]>;

  // actions
  setActiveType: (type: FileType) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSortType: (type: SortType) => void;
  setSortOrder: (order: SortOrder) => void;
  setSafeMode: (enabled: boolean) => void;
  setImageLoadMode: (mode: ImageLoadMode) => void;
  setItemsPerPage: (count: number) => void;

  addFileLocal: (file: FileItem, fileType: FileType) => void;
  deleteFilesLocal: (names: string[]) => void;
  updateFileMetadata: (name: string, metadata: FileMetadata) => void;
  toggleSelection: (name: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

const emptyBucket = (): FileBucket => ({
  items: [],
  cursor: undefined,
  hasMore: true,
  loading: false,
});

export const useFileStore = create<FileStore>((set, get) => ({
  activeType: FileType.Image,
  viewMode: ViewMode.Grid,
  searchQuery: "",
  sortType: SortType.UploadedAt,
  sortOrder: SortOrder.Desc,
  safeMode: true, // 默认开启安全浏览模式
  imageLoadMode: ImageLoadMode.DataSaver, // 默认为省流模式
  itemsPerPage: 20, // 默认每页20条

  buckets: {
    [FileType.Image]: emptyBucket(),
    [FileType.Audio]: emptyBucket(),
    [FileType.Video]: emptyBucket(),
    [FileType.Document]: emptyBucket(),
  },

  selectedKeys: {
    [FileType.Image]: [],
    [FileType.Audio]: [],
    [FileType.Video]: [],
    [FileType.Document]: [],
  },

  setActiveType: async (type) => {
    const { activeType, viewMode } = get();
    // 如果从图片切换到其他类型，且当前是瀑布流模式，需要切换为其他模式
    if (activeType === FileType.Image && type !== FileType.Image && viewMode === ViewMode.Masonry) {
      get().setViewMode(ViewMode.Grid);
    }
    // 先设置activeType
    set((state) => ({
      activeType: type,
    }));
    // 保存到localStorage
    setToStorage(STORAGE_KEYS.ACTIVE_TYPE, type);

    // 检查该类型是否从未加载过数据（cursor为undefined）
    const bucket = get().buckets[type];
    if (bucket.cursor === undefined) {
      await get().fetchNextPage();
    }
  },

  fetchNextPage: async () => {
    const { activeType, buckets } = get();
    const bucket = buckets[activeType];

    if (bucket.loading || !bucket.hasMore) return;

    set((state) => ({
      buckets: {
        ...state.buckets,
        [activeType]: { ...bucket, loading: true },
      },
    }));

    const params: ListFilesRequest = {
      fileType: activeType,
    };

    if (bucket.cursor) {
      params.cursor = bucket.cursor;
    }

    const data = await getFileList(params);

    set((state) => {
      const prev = state.buckets[activeType];
      const newBuckets = {
        ...state.buckets,
        [activeType]: {
          items: mergeByName(prev.items, data.keys),
          cursor: data.cursor,
          hasMore: !data.list_complete,
          loading: false,
        },
      };
      return {
        buckets: newBuckets,
      };
    });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    // 保存到localStorage
    setToStorage(STORAGE_KEYS.VIEW_MODE, mode);
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  setSortType: (type) => {
    set({ sortType: type });
    setToStorage(STORAGE_KEYS.SORT_TYPE, type);
  },

  setSortOrder: (order) => {
    set({ sortOrder: order });
    setToStorage(STORAGE_KEYS.SORT_ORDER, order);
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

  addFileLocal: (file, fileType) => {
    set((state) => {
      const newBuckets = {
        ...state.buckets,
        [fileType]: {
          ...state.buckets[fileType],
          items: [...state.buckets[fileType].items, file],
        },
      };
      return {
        buckets: newBuckets,
      };
    });
  },

  deleteFilesLocal: (names: string[]) =>
    set((state) => {
      // 从所有桶中删除文件
      const newBuckets = Object.entries(state.buckets).reduce(
        (acc, [type, bucket]) => {
          acc[type as FileType] = {
            ...bucket,
            items: bucket.items.filter((item) => !names.includes(item.name)),
          };
          return acc;
        },
        {} as Record<FileType, FileBucket>
      );

      return {
        buckets: newBuckets,
      };
    }),

  updateFileMetadata: (name, metadata) =>
    set((state) => {
      const newBuckets = Object.entries(state.buckets).reduce(
        (acc, [type, bucket]) => {
          acc[type as FileType] = {
            ...bucket,
            items: bucket.items.map((item) =>
              item.name === name
                ? {
                    ...item,
                    metadata,
                  }
                : item
            ),
          };
          return acc;
        },
        {} as Record<FileType, FileBucket>
      );

      return { buckets: newBuckets };
    }),

  toggleSelection: (name) =>
    set((state) => {
      const currentType = state.activeType;
      const current = state.selectedKeys[currentType];
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

  selectAll: () =>
    set((state) => {
      const { activeType, buckets } = state;
      return {
        selectedKeys: {
          ...state.selectedKeys,
          [activeType]: buckets[activeType].items.map((item) => item.name),
        },
      };
    }),

  clearSelection: () =>
    set((state) => ({
      selectedKeys: {
        ...state.selectedKeys,
        [state.activeType]: [],
      },
    })),
}));

export const useActiveBucket = () =>
  useFileStore((s) => s.buckets[s.activeType]);

export const useActiveItems = () =>
  useFileStore((s) => s.buckets[s.activeType].items);

export const useBucketItems = (type: FileType) =>
  useFileStore((s) => s.buckets[type].items);

export const useActiveSelectedKeys = () =>
  useFileStore((s) => s.selectedKeys[s.activeType]);

export const useFilteredFiles = () => {
  const { searchQuery, sortType, sortOrder } = useFileStore();
  const items = useActiveItems();

  return useMemo(() => {
    // 1. 预处理搜索词（只做一次）
    const query = searchQuery.trim().toLowerCase();

    // 2. 过滤
    const filtered = items.filter((item) => {
      if (!query) return true;

      const name =
        item.metadata?.fileName?.toLowerCase() ?? item.name.toLowerCase();

      // 文件名命中
      if (name.includes(query)) return true;

      // 搜索词较长时，额外匹配原始 name
      if (query.length >= 3) {
        return item.name.toLowerCase().includes(query);
      }

      return false;
    });

    // 3. 排序
    const sorted = filtered.slice().sort((a, b) => {
      let diff = 0;

      switch (sortType) {
        case SortType.Name: {
          const nameA =
            a.metadata?.fileName?.toLowerCase() ?? a.name.toLowerCase();
          const nameB =
            b.metadata?.fileName?.toLowerCase() ?? b.name.toLowerCase();
          diff = nameA.localeCompare(nameB);
          break;
        }

        case SortType.UploadedAt: {
          diff = (a.metadata?.uploadedAt ?? 0) - (b.metadata?.uploadedAt ?? 0);
          break;
        }

        case SortType.FileSize: {
          diff = (a.metadata?.fileSize ?? 0) - (b.metadata?.fileSize ?? 0);
          break;
        }
      }

      return sortOrder === SortOrder.Asc ? diff : -diff;
    });

    return sorted;
  }, [items, searchQuery, sortType, sortOrder]);
};
