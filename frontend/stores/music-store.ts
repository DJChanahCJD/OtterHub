import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MusicTrack, MusicSource, MusicStoreData } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';
import { storeKey } from '.';
import { musicStoreApi } from '@/lib/api/settings';

/**
 * 构建云端同步的 payload
 */
const buildCloudPayload = (state: MusicStoreData) => ({
  favorites: state.favorites,
  playlists: state.playlists,
  queue: state.queue,
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
    quality: local.quality || cloud.quality || "320",
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

  createPlaylist: (name: string) => void;
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

  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setAudioCurrentTime: (time: number) => void;

  // --- Playback (Queue) ---
  queue: MusicTrack[];
  currentIndex: number;

  /** 
   * Play a context (list of tracks). 
   * Replaces the current queue with this list and starts playing from startIndex.
   */
  playContext: (tracks: MusicTrack[], startIndex?: number) => void;

  /** Add a single track to the end of the queue */
  addToQueue: (track: MusicTrack) => void;

  /** Remove a track from the current queue */
  removeFromQueue: (trackId: string) => void;

  clearQueue: () => void;
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
        return { favorites: [...state.favorites, track] };
      }),
      removeFromFavorites: (trackId) => set((state) => ({
        favorites: state.favorites.filter(t => t.id !== trackId)
      })),
      isFavorite: (trackId) => get().favorites.some(t => t.id === trackId),

      createPlaylist: (name) => set((state) => ({
        playlists: [
          ...state.playlists,
          { id: uuidv4(), name, tracks: [], createdAt: Date.now() }
        ]
      })),
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
            ? { ...p, tracks: p.tracks.some(t => t.id === track.id) ? p.tracks : [...p.tracks, track] }
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

      quality: "320",
      searchSource: "netease",
      setQuality: (quality) => set({ quality }),
      setSearchSource: (searchSource) => set({ searchSource }),

      volume: 0.7,
      isRepeat: false,
      isShuffle: false,
      currentAudioTime: 0,

      setVolume: (volume) => set({ volume }),
      toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
      setAudioCurrentTime: (currentTime) => set({ currentAudioTime: currentTime }),

      queue: [],
      currentIndex: 0,

      playContext: (tracks, startIndex) => set((state) => {
        let actualIndex = startIndex;

        // 如果未指定 startIndex (例如点击播放全部)，且处于随机模式，则随机选一首
        if (actualIndex === undefined) {
          if (state.isShuffle && tracks.length > 0) {
            actualIndex = Math.floor(Math.random() * tracks.length);
          } else {
            actualIndex = 0;
          }
        }

        return {
          queue: tracks,
          currentIndex: actualIndex,
          currentAudioTime: 0 // Reset time on new context
        };
      }),

      addToQueue: (track) => set((state) => {
        if (state.queue.some(t => t.id === track.id)) return state;
        return { queue: [...state.queue, track] };
      }),

      removeFromQueue: (trackId) => set((state) => ({
        queue: state.queue.filter(t => t.id !== trackId)
      })),

      clearQueue: () => set({ queue: [], currentIndex: 0, currentAudioTime: 0 }),
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
