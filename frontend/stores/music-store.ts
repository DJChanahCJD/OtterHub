import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MusicTrack } from '@/lib/music-api';

interface MusicState {
  favorites: MusicTrack[];
  addToFavorites: (track: MusicTrack) => void;
  removeFromFavorites: (trackId: string) => void;
  isFavorite: (trackId: string) => boolean;
  
  playlist: MusicTrack[];
  setPlaylist: (list: MusicTrack[]) => void;
  addToPlaylist: (track: MusicTrack) => void;
  removeFromPlaylist: (trackId: string) => void;
  clearPlaylist: () => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addToFavorites: (track) => set((state) => {
        if (state.favorites.some(t => t.id === track.id)) return state;
        return { favorites: [...state.favorites, track] };
      }),
      removeFromFavorites: (trackId) => set((state) => ({
        favorites: state.favorites.filter(t => t.id !== trackId)
      })),
      isFavorite: (trackId) => get().favorites.some(t => t.id === trackId),

      playlist: [],
      setPlaylist: (list) => set({ playlist: list }),
      addToPlaylist: (track) => set((state) => {
        if (state.playlist.some(t => t.id === track.id)) return state;
        return { playlist: [...state.playlist, track] };
      }),
      removeFromPlaylist: (trackId) => set((state) => ({
        playlist: state.playlist.filter(t => t.id !== trackId)
      })),
      clearPlaylist: () => set({ playlist: [] }),
    }),
    {
      name: 'music-storage',
      partialize: (state) => ({ favorites: state.favorites }), // Only persist favorites for now, or playlist too if desired? User said "local cache prototype", so maybe persisting playlist is nice too.
    }
  )
);
