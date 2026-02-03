import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MusicTrack } from '@/lib/music-api';
import { v4 as uuidv4 } from 'uuid';

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
  addToUserPlaylist: (playlistId: string, track: MusicTrack) => void;
  removeFromUserPlaylist: (playlistId: string, trackId: string) => void;

  // --- Playback State (Persisted) ---
  volume: number;
  isRepeat: boolean;
  isShuffle: boolean;
  
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;

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
  setCurrentIndex: (index: number) => void;
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
      addToUserPlaylist: (pid, track) => set((state) => ({
        playlists: state.playlists.map(p => 
          p.id === pid 
            ? { ...p, tracks: p.tracks.some(t => t.id === track.id) ? p.tracks : [...p.tracks, track] }
            : p
        )
      })),
      removeFromUserPlaylist: (pid, tid) => set((state) => ({
        playlists: state.playlists.map(p => 
          p.id === pid 
            ? { ...p, tracks: p.tracks.filter(t => t.id !== tid) }
            : p
        )
      })),

      volume: 0.7,
      isRepeat: false,
      isShuffle: false,
      
      setVolume: (volume) => set({ volume }),
      toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

      queue: [],
      currentIndex: 0,

      playContext: (tracks, startIndex = 0) => set({ 
        queue: tracks,
        currentIndex: startIndex
      }),
      
      addToQueue: (track) => set((state) => {
        if (state.queue.some(t => t.id === track.id)) return state;
        return { queue: [...state.queue, track] };
      }),
      
      removeFromQueue: (trackId) => set((state) => ({
        queue: state.queue.filter(t => t.id !== trackId)
      })),
      
      clearQueue: () => set({ queue: [], currentIndex: 0 }),
      setCurrentIndex: (index) => set({ currentIndex: index }),
    }),
    {
      name: 'music-storage',
      partialize: (state) => ({ 
        favorites: state.favorites,
        playlists: state.playlists,
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        isRepeat: state.isRepeat,
        isShuffle: state.isShuffle
      }),
    }
  )
);
