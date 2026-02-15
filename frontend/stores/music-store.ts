import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MusicTrack, MusicSource, MusicStoreData } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';
import { storeKey } from '.';
import { musicStoreApi } from '@/lib/api/settings';

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

/**
 * 构建云端同步的 payload
 */
export const buildCloudPayload = (state: MusicStoreData) => ({
  favorites: state.favorites,
  playlists: state.playlists,
  queue: state.queue,
  originalQueue: state.originalQueue,
  currentIndex: state.currentIndex,
  volume: state.volume,
  isRepeat: state.isRepeat,
  isShuffle: state.isShuffle,
  quality: state.quality,
  searchSource: state.searchSource,
  updatedAt: Date.now(),
});

/**
 * 合并本地和云端数据的纯函数
 */
function mergeState(local: MusicStoreData, cloud: MusicStoreData): Partial<typeof local> {
  if (!cloud) return local;

  // 合并喜欢歌曲：去重，保留两边的数据
  const localFavoriteIds = new Set(local.favorites.map((t: MusicTrack) => t.id));
  const cloudFavorites = cloud.favorites || [];
  const newFavorites = [...local.favorites];
  
  cloudFavorites.forEach((track: MusicTrack) => {
    if (track && track.id && !localFavoriteIds.has(track.id)) {
      newFavorites.push(track);
      localFavoriteIds.add(track.id);
    }
  });

  // 合并歌单：按 ID 匹配，合并歌曲
  const localPlaylistsMap = new Map(local.playlists.map((p: Playlist) => [p.id, p]));
  const cloudPlaylists = cloud.playlists || [];
  const newPlaylists = [...local.playlists];
  
  cloudPlaylists.forEach((cloudPlaylist: Playlist) => {
    if (cloudPlaylist && cloudPlaylist.id && localPlaylistsMap.has(cloudPlaylist.id)) {
      // 歌单已存在，合并歌曲
      const localPlaylist = localPlaylistsMap.get(cloudPlaylist.id) as Playlist;
      if (localPlaylist && Array.isArray(localPlaylist.tracks)) {
        const localTrackIds = new Set(localPlaylist.tracks.map((t: MusicTrack) => t.id));
        const mergedTracks = [...localPlaylist.tracks];
        
        if (Array.isArray(cloudPlaylist.tracks)) {
          cloudPlaylist.tracks.forEach((track: MusicTrack) => {
            if (track && track.id && !localTrackIds.has(track.id)) {
              mergedTracks.push(track);
              localTrackIds.add(track.id);
            }
          });
        }
        
        // 更新歌单
        const playlistIndex = newPlaylists.findIndex(p => p.id === cloudPlaylist.id);
        if (playlistIndex !== -1) {
          newPlaylists[playlistIndex] = {
            ...localPlaylist,
            tracks: mergedTracks
          };
        }
      }
    } else if (cloudPlaylist && cloudPlaylist.id) {
      // 歌单不存在，添加新歌单
      newPlaylists.push(cloudPlaylist);
      localPlaylistsMap.set(cloudPlaylist.id, cloudPlaylist);
    }
  });

  // 合并其他设置（优先保留本地设置）
  return {
    ...local,
    favorites: newFavorites,
    playlists: newPlaylists,
    quality: local.quality || cloud.quality || "192",
    searchSource: local.searchSource || cloud.searchSource || "netease",
    volume: local.volume !== undefined ? local.volume : cloud.volume || 0.7,
    isRepeat: local.isRepeat !== undefined ? local.isRepeat : cloud.isRepeat || false,
    isShuffle: local.isShuffle !== undefined ? local.isShuffle : cloud.isShuffle || false,
  };
}

export interface Playlist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  createdAt: number;
}

interface MusicState {
  // --- Library (Persisted) ---
  favorites: MusicTrack[];
  playlists: Playlist[];

  addToFavorites: (track: MusicTrack) => void;
  removeFromFavorites: (trackId: string) => void;
  isFavorite: (trackId: string) => boolean;

  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, track: MusicTrack) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;

  // --- Settings (Persisted) ---
  quality: string;
  searchSource: MusicSource;
  setQuality: (quality: string) => void;
  setSearchSource: (source: MusicSource) => void;

  // --- Playback State (Persisted) ---
  volume: number;
  isRepeat: boolean;
  isShuffle: boolean;
  currentAudioTime: number; // Persisted playback progress
  isPlaying: boolean;
  isLoading: boolean;
  seekTimestamp: number; // Used to trigger seek
  duration: number;

  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setAudioCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  setIsLoading: (isLoading: boolean) => void;
  seek: (time: number) => void;

  // --- Playback (Queue) ---
  queue: MusicTrack[];
  originalQueue: MusicTrack[];
  currentIndex: number;

  /** 
   * Play a context (list of tracks). 
   * Replaces the current queue with this list and starts playing from startIndex.
   */
  playContext: (tracks: MusicTrack[], startIndex?: number) => void;

  /** Add a single track to the end of the queue */
  addToQueue: (track: MusicTrack) => void;

  /** Insert a track next to current and switch to it */
  playNext: (track: MusicTrack) => void;

  /** Remove a track from the current queue */
  removeFromQueue: (trackId: string) => void;

  clearQueue: () => void;
  reshuffle: () => void;
  setCurrentIndex: (index: number, resetTime?: boolean) => void;

  /**
   * 与云端同步
   * 上传本地数据或合并云端数据
   */
  syncWithCloud: () => Promise<'uploaded' | 'merged'>;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: [],

      addToFavorites: (track) => set((state) => {
        if (state.favorites.some(t => t.id === track.id)) return state;
        return { favorites: [track, ...state.favorites] };
      }),
      removeFromFavorites: (trackId) => set((state) => ({
        favorites: state.favorites.filter(t => t.id !== trackId)
      })),
      isFavorite: (trackId) => get().favorites.some(t => t.id === trackId),

      createPlaylist: (name) => {
        const id = uuidv4();
        set((state) => ({
          playlists: [
            { id, name, tracks: [], createdAt: Date.now() },
            ...state.playlists
          ]
        }));
        return id;
      },
      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter(p => p.id !== id)
      })),
      renamePlaylist: (id, name) => set((state) => ({
        playlists: state.playlists.map(p =>
          p.id === id
            ? { ...p, name }
            : p
        )
      })),
      addToPlaylist: (pid, track) => set((state) => ({
        playlists: state.playlists.map(p =>
          p.id === pid
            ? { ...p, tracks: p.tracks.some(t => t.id === track.id) ? p.tracks : [track, ...p.tracks] }
            : p
        )
      })),
      removeFromPlaylist: (pid, tid) => set((state) => ({
        playlists: state.playlists.map(p =>
          p.id === pid
            ? { ...p, tracks: p.tracks.filter(t => t.id !== tid) }
            : p
        )
      })),

      quality: "192",
      searchSource: "all",
      setQuality: (quality) => set({ quality }),
      setSearchSource: (searchSource) => set({ searchSource }),

      volume: 0.7,
      isRepeat: false,
      isShuffle: false,
      currentAudioTime: 0,
      isPlaying: false,
      isLoading: false,
      seekTimestamp: 0,
      duration: 0,

      setVolume: (volume) => set({ volume }),
      toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
      toggleShuffle: () => set((state) => {
        const newIsShuffle = !state.isShuffle;

        if (newIsShuffle) {
          // 开启随机：备份 -> 打乱
          if (state.queue.length <= 1) {
            return { isShuffle: true, originalQueue: state.queue };
          }

          const currentTrack = state.queue[state.currentIndex];
          // 排除当前歌曲，打乱剩余的
          const rest = state.queue.filter((_, i) => i !== state.currentIndex);
          const shuffledRest = shuffleArray(rest);
          const newQueue = [currentTrack, ...shuffledRest];

          return {
            isShuffle: true,
            originalQueue: state.queue,
            queue: newQueue,
            currentIndex: 0,
          };
        } else {
          // 关闭随机：恢复
          if (!state.originalQueue || state.originalQueue.length === 0) {
            return { isShuffle: false };
          }

          const currentTrack = state.queue[state.currentIndex];
          // 在原始队列中找到当前歌曲的新位置
          const newIndex = state.originalQueue.findIndex((t) => t.id === currentTrack.id);

          return {
            isShuffle: false,
            queue: state.originalQueue,
            currentIndex: newIndex !== -1 ? newIndex : 0,
            originalQueue: [], 
          };
        }
      }),
      setAudioCurrentTime: (currentTime) => set({ currentAudioTime: currentTime }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsLoading: (isLoading) => set({ isLoading }),
      seek: (time) => set({ currentAudioTime: time, seekTimestamp: Date.now() }),

      queue: [],
      originalQueue: [],
      currentIndex: 0,

      playContext: (tracks, startIndex) => set((state) => {
        let actualIndex = startIndex ?? 0;

        // 始终保存原始队列
        const originalQueue = tracks;

        if (state.isShuffle && tracks.length > 0) {
          // 如果 startIndex 未定义，且是随机模式，随机选一首作为第一首
          if (startIndex === undefined) {
            actualIndex = Math.floor(Math.random() * tracks.length);
          }

          const firstTrack = tracks[actualIndex];
          const rest = tracks.filter((_, i) => i !== actualIndex);
          const shuffledRest = shuffleArray(rest);
          const newQueue = [firstTrack, ...shuffledRest];

          return {
            queue: newQueue,
            originalQueue,
            currentIndex: 0,
            currentAudioTime: 0,
            isPlaying: true,
          };
        }

        return {
          queue: tracks,
          originalQueue,
          currentIndex: actualIndex,
          currentAudioTime: 0,
          isPlaying: true,
        };
      }),

      addToQueue: (track) => set((state) => {
        if (state.queue.some((t) => t.id === track.id)) return state;
        const newQueue = [...state.queue, track];
        // 如果在随机模式下，也要添加到 originalQueue，以防切回顺序播放时丢失
        const newOriginalQueue = state.isShuffle 
          ? [...(state.originalQueue || []), track] 
          : []; // 非随机模式下 originalQueue 通常为空或不重要，但如果之后切换到随机，playContext会重置它。
                // 不过如果用户先顺序播放，add，再切随机，toggleShuffle会用 queue 填充 originalQueue。
                // 所以这里只需要在 isShuffle 为 true 时维护 originalQueue。
        
        return { 
          queue: newQueue,
          originalQueue: state.isShuffle ? newOriginalQueue : state.originalQueue
        };
      }),

      playNext: (track) => set((state) => {
        // 如果队列为空，直接播放
        if (state.queue.length === 0) {
          return {
            queue: [track],
            originalQueue: [track],
            currentIndex: 0,
            currentAudioTime: 0,
            isPlaying: true,
          };
        }

        const newQueue = [...state.queue];
        const existingIndex = newQueue.findIndex((t) => t.id === track.id);
        
        // 如果这首歌已经在当前播放，只需重置时间
        if (existingIndex === state.currentIndex) {
          return { currentAudioTime: 0 };
        }

        let targetIndex = state.currentIndex + 1;

        if (existingIndex !== -1) {
          // 移除已存在的
          newQueue.splice(existingIndex, 1);
          // 如果移除的位置在当前位置之前，targetIndex 需要减 1
          if (existingIndex < state.currentIndex) {
            targetIndex--;
          }
        }

        // 插入到 targetIndex
        newQueue.splice(targetIndex, 0, track);

        // 处理 originalQueue (随机模式下同步更新)
        let newOriginalQueue = state.originalQueue;
        if (state.isShuffle) {
          const oQueue = [...(state.originalQueue || [])];
          if (!oQueue.some(t => t.id === track.id)) {
            oQueue.push(track);
          }
          newOriginalQueue = oQueue;
        }

        return {
          queue: newQueue,
          currentIndex: targetIndex,
          currentAudioTime: 0,
          originalQueue: newOriginalQueue,
        };
      }),

      removeFromQueue: (trackId) => set((state) => ({
        queue: state.queue.filter((t) => t.id !== trackId),
        originalQueue: state.isShuffle 
          ? (state.originalQueue || []).filter((t) => t.id !== trackId)
          : state.originalQueue
      })),

      clearQueue: () => set({ queue: [], originalQueue: [], currentIndex: 0, currentAudioTime: 0 }),
      reshuffle: () => set((state) => {
        if (!state.isShuffle || state.queue.length <= 1) return state;

        // 使用 originalQueue 进行重新打乱
        const sourceQueue = (state.originalQueue && state.originalQueue.length > 0)
          ? state.originalQueue
          : state.queue;

        const currentTrack = state.queue[state.currentIndex];
        // 排除当前歌曲
        const rest = sourceQueue.filter((t) => t.id !== currentTrack.id);
        const shuffledRest = shuffleArray(rest);
        const newQueue = [currentTrack, ...shuffledRest];

        return {
          queue: newQueue,
          currentIndex: 0,
        };
      }),
      setCurrentIndex: (index, resetTime = true) =>
        set((state) => ({
          currentIndex: index,
          currentAudioTime: resetTime ? 0 : state.currentAudioTime,
        })),

      syncWithCloud: async () => {
        const state = get();

        // 1 获取云端
        const cloudData = await musicStoreApi.get();

        // 云端为空 → 上传本地
        if (!cloudData || Object.keys(cloudData).length === 0) {
          await musicStoreApi.update(buildCloudPayload(state));
          return "uploaded";
        }

        // 2 合并
        set(s => mergeState(s, cloudData));

        // 3 上传合并结果
        const merged = get();
        await musicStoreApi.update(buildCloudPayload(merged));

        return "merged";
      }

    }),
    {
      name: storeKey.MusicStore,
      partialize: (state) => ({
        favorites: state.favorites,
        playlists: state.playlists,
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        isRepeat: state.isRepeat,
        isShuffle: state.isShuffle,
        currentAudioTime: state.currentAudioTime,
        quality: state.quality,
        searchSource: state.searchSource,
      }),
    }
  )
);
