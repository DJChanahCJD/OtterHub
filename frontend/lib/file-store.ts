// file-store.ts
import { create } from "zustand";
import { FileItem, FileType, ListFilesRequest, ViewMode } from "./types";
import { deleteFile, getFileList } from "./api";
import { STORAGE_KEYS, getFromStorage, setToStorage } from "./local-storage";

type FileBucket = {
  items: FileItem[];
  cursor?: string;
  hasMore: boolean;
  loading: boolean;
};

interface FileStore {
  // 当前视图状态
  activeType: FileType;
  viewMode: ViewMode;

  // 按前缀分桶
  buckets: Record<FileType, FileBucket>;

  // selection 全局，暂不考虑分桶
  selectedKeys: string[];

  // actions
  setActiveType: (type: FileType) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;

  addFileLocal: (file: FileItem, fileType: FileType) => void;
  deleteFilesLocal: (names: string[]) => void;
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
