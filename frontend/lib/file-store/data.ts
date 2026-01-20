import { create } from "zustand";
import {
  FileItem,
  FileMetadata,
  FileType,
  ListFilesRequest,
  TRASH_EXPIRATION_TTL,
  ViewMode,
  trashPrefix,
} from "../types";
import { getFileList } from "../api";
import { STORAGE_KEYS, setToStorage } from "../local-storage";
import { getFileTypeFromKey } from "../utils/file";
import { useFileUIStore } from "./ui";

type FileBucket = {
  items: FileItem[];
  cursor?: string;
  hasMore: boolean;
  loading: boolean;
};

/**
 * 按文件名合并本地和服务端文件列表
 */
function mergeByName(local: FileItem[], remote: FileItem[]): FileItem[] {
  const map = new Map<string, FileItem>();
  for (const item of local) map.set(item.name, item);
  for (const item of remote) map.set(item.name, item);
  return Array.from(map.values());
}

interface FileDataState {
  activeType: FileType;
  buckets: Record<FileType, FileBucket>;

  // actions
  setActiveType: (type: FileType) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  fetchBucket: (type: FileType) => Promise<void>;
  
  addFileLocal: (file: FileItem, fileType: FileType) => void;
  deleteFilesLocal: (names: string[]) => void;
  deleteFilesLocalByType: (names: string[], type: FileType) => void;
  moveToTrashLocal: (file: FileItem) => Promise<void>;
  restoreFromTrashLocal: (file: FileItem) => Promise<void>;
  updateFileMetadata: (name: string, metadata: FileMetadata) => void;
}

const emptyBucket = (): FileBucket => ({
  items: [],
  cursor: undefined,
  hasMore: true,
  loading: false,
});

export const useFileDataStore = create<FileDataState>((set, get) => ({
  activeType: FileType.Image,
  buckets: {
    [FileType.Image]: emptyBucket(),
    [FileType.Audio]: emptyBucket(),
    [FileType.Video]: emptyBucket(),
    [FileType.Document]: emptyBucket(),
    [FileType.Trash]: emptyBucket(),
  },

  setActiveType: async (type) => {
    const { activeType } = get();
    const { viewMode } = useFileUIStore.getState();
    if (activeType === FileType.Image && type !== FileType.Image && viewMode === ViewMode.Masonry) {
      useFileUIStore.setState({ viewMode: ViewMode.Grid });
    }
    set({ activeType: type });
    setToStorage(STORAGE_KEYS.ACTIVE_TYPE, type);

    // 如果从未加载过数据，触发一次分页加载
    const bucket = get().buckets[type];
    if (bucket.cursor === undefined) {
      await get().fetchNextPage();
    }
  },

  fetchNextPage: async () => {
    const { activeType } = get();
    await get().fetchBucket(activeType);
  },

  fetchBucket: async (type) => {
    const { buckets } = get();
    const bucket = buckets[type];

    if (bucket.loading || !bucket.hasMore) return;

    set((state) => ({
      buckets: {
        ...state.buckets,
        [type]: { ...bucket, loading: true },
      },
    }));

    try {
      const params: ListFilesRequest = { fileType: type };
      if (bucket.cursor) params.cursor = bucket.cursor;

      const data = await getFileList(params);

      set((state) => {
        const prev = state.buckets[type];
        return {
          buckets: {
            ...state.buckets,
            [type]: {
              items: bucket.cursor !== undefined ? mergeByName(prev.items, data.keys) : data.keys,
              cursor: data.cursor,
              hasMore: !data.list_complete,
              loading: false,
            },
          },
        };
      });
    } catch (error) {
      console.error(`Failed to fetch bucket ${type}:`, error);
      set((state) => ({
        buckets: {
          ...state.buckets,
          [type]: { ...bucket, loading: false },
        },
      }));
    }
  },

  addFileLocal: (file, fileType) => {
    set((state) => ({
      buckets: {
        ...state.buckets,
        [fileType]: {
          ...state.buckets[fileType],
          items: [...state.buckets[fileType].items, file],
        },
      },
    }));
  },

  moveToTrashLocal: async (file: FileItem) => {
    const fileType = getFileTypeFromKey(file.name);
    get().deleteFilesLocalByType([file.name], fileType);
    file.name = trashPrefix + file.name;
    // expiration 为绝对时间戳（秒）
    file.expiration = Math.floor(Date.now() / 1000) + TRASH_EXPIRATION_TTL;
    get().addFileLocal(file, FileType.Trash);
  },

  restoreFromTrashLocal: async (file: FileItem) => {
    const originalKey = file.name.startsWith(trashPrefix)
      ? file.name.slice(trashPrefix.length)
      : file.name;
    const originalType = getFileTypeFromKey(originalKey);
    get().deleteFilesLocalByType([file.name], FileType.Trash);
    file.name = originalKey;
    get().addFileLocal(file, originalType);
  },

  deleteFilesLocal: (names: string[]) =>
    set((state) => {
      // 1. 更新 buckets
      const newBuckets = Object.entries(state.buckets).reduce((acc, [type, bucket]) => {
        acc[type as FileType] = {
          ...bucket,
          items: bucket.items.filter((item) => !names.includes(item.name)),
        };
        return acc;
      }, {} as Record<FileType, FileBucket>);

      // 2. 同步清理 selection
      const { selectedKeys } = useFileUIStore.getState();
      const newSelectedKeys = Object.entries(selectedKeys).reduce((acc, [type, keys]) => {
        acc[type as FileType] = keys.filter((key) => !names.includes(key));
        return acc;
      }, {} as Record<FileType, string[]>);
      useFileUIStore.setState({ selectedKeys: newSelectedKeys });

      return { buckets: newBuckets };
    }),

  deleteFilesLocalByType: (names: string[], type: FileType) =>
    set((state) => {
      // 1. 更新指定类型的 bucket
      const newBuckets = {
        ...state.buckets,
        [type]: {
          ...state.buckets[type],
          items: state.buckets[type].items.filter((item) => !names.includes(item.name)),
        },
      };

      // 2. 同步清理该类型的 selection
      const { selectedKeys } = useFileUIStore.getState();
      const currentSelection = selectedKeys[type] || [];
      const newSelectedKeys = {
        ...selectedKeys,
        [type]: currentSelection.filter((key) => !names.includes(key)),
      };
      useFileUIStore.setState({ selectedKeys: newSelectedKeys });

      return { buckets: newBuckets };
    }),

  updateFileMetadata: (name, metadata) =>
    set((state) => {
      const newBuckets = Object.entries(state.buckets).reduce((acc, [type, bucket]) => {
        acc[type as FileType] = {
          ...bucket,
          items: bucket.items.map((item) =>
            item.name === name ? { ...item, metadata } : item
          ),
        };
        return acc;
      }, {} as Record<FileType, FileBucket>);
      return { buckets: newBuckets };
    }),
}));

export const useActiveBucket = () =>
  useFileDataStore((s) => s.buckets[s.activeType]);

export const useActiveItems = () =>
  useFileDataStore((s) => s.buckets[s.activeType].items);

export const useBucketItems = (type: FileType) =>
  useFileDataStore((s) => s.buckets[type].items);
