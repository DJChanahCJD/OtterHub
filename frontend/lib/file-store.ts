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
} from "./types";
import { deleteFile, getFileList } from "./api";
import { STORAGE_KEYS, getFromStorage, setToStorage } from "./local-storage";

type FileBucket = {
  items: FileItem[];
  cursor?: string;
  hasMore: boolean;
  loading: boolean;
};

interface FileStore {
  activeType: FileType;
  viewMode: ViewMode;
  searchQuery: string;
  sortType: SortType;
  sortOrder: SortOrder;

  // 按前缀分桶
  buckets: Record<FileType, FileBucket>;

  // selection 全局，暂不考虑分桶
  selectedKeys: string[];

  // actions
  setActiveType: (type: FileType) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSortType: (type: SortType) => void;
  setSortOrder: (order: SortOrder) => void;

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

  buckets: {
    [FileType.Image]: emptyBucket(),
    [FileType.Audio]: emptyBucket(),
    [FileType.Video]: emptyBucket(),
    [FileType.Document]: emptyBucket(),
  },

  selectedKeys: [],

  setActiveType: async (type) => {
    // 先设置activeType
    set((state) => ({
      activeType: type,
    }));
    // 保存到localStorage
    setToStorage(STORAGE_KEYS.ACTIVE_TYPE, type);

    // 检查该类型的bucketItems是否为空，为空时才fetch数据
    const bucket = get().buckets[type];
    if (bucket.items.length === 0) {
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
      const newBuckets = {
        ...state.buckets,
        [activeType]: {
          items: [...bucket.items, ...data.keys],
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

  addFileLocal: (file, fileType) =>
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
    }),

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
    set((state) => ({
      selectedKeys: state.selectedKeys.includes(name)
        ? state.selectedKeys.filter((key) => key !== name)
        : [...state.selectedKeys, name],
    })),

  selectAll: () =>
    set((state) => ({
      selectedKeys: state.buckets[state.activeType].items.map(
        (item) => item.name
      ),
    })),

  clearSelection: () => set({ selectedKeys: [] }),
}));

export const useActiveBucket = () =>
  useFileStore((s) => s.buckets[s.activeType]);

export const useActiveItems = () =>
  useFileStore((s) => s.buckets[s.activeType].items);

export const useBucketItems = (type: FileType) =>
  useFileStore((s) => s.buckets[type].items);

export const useFilteredFiles = () => {
  const searchQuery = useFileStore((s) => s.searchQuery);
  const sortType = useFileStore((s) => s.sortType);
  const sortOrder = useFileStore((s) => s.sortOrder);
  const items = useActiveItems()

  let filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const fileName = item.metadata?.fileName?.toLowerCase() || item.name.toLowerCase();
    return fileName.includes(query);
  });

  filteredItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;

    if (sortType === SortType.Name) {
      const nameA = a.metadata?.fileName?.toLowerCase() || a.name.toLowerCase();
      const nameB = b.metadata?.fileName?.toLowerCase() || b.name.toLowerCase();
      comparison = nameA.localeCompare(nameB);
    } else if (sortType === SortType.UploadedAt) {
      const timeA = a.metadata?.uploadedAt || 0;
      const timeB = b.metadata?.uploadedAt || 0;
      comparison = timeA - timeB;
    } else if (sortType === SortType.FileSize) {
      const sizeA = a.metadata?.fileSize || 0;
      const sizeB = b.metadata?.fileSize || 0;
      comparison = sizeA - sizeB;
    }

    return sortOrder === SortOrder.Asc ? comparison : -comparison;
  });

  return filteredItems;
};
