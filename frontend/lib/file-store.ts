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
  safeMode: boolean; // 安全浏览模式
  imageLoadMode: ImageLoadMode; // 图片加载模式

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
  setSafeMode: (enabled: boolean) => void;
  setImageLoadMode: (mode: ImageLoadMode) => void;

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

  buckets: {
    [FileType.Image]: emptyBucket(),
    [FileType.Audio]: emptyBucket(),
    [FileType.Video]: emptyBucket(),
    [FileType.Document]: emptyBucket(),
  },

  selectedKeys: [],

  setActiveType: async (type) => {
    // 如果是图片瀑布流，需要切换为其他模式
    if (get().activeType === FileType.Image && get().viewMode === ViewMode.Masonry) {
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

  setSafeMode: (enabled) => {
    set({ safeMode: enabled });
    setToStorage(STORAGE_KEYS.SAFE_MODE, enabled);
  },

  setImageLoadMode: (mode) => {
    set({ imageLoadMode: mode });
    setToStorage(STORAGE_KEYS.IMAGE_LOAD_MODE, mode);
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
