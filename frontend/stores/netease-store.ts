import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetEaseState {
  cookie: string;
  userId: string;
  playlists: any[];
  setSession: (cookie: string, userId: string) => void;
  setPlaylists: (playlists: any[]) => void;
  clearSession: () => void;
}

export const useNetEaseStore = create<NetEaseState>()(
  persist(
    (set) => ({
      cookie: '',
      userId: '',
      playlists: [],
      setSession: (cookie, userId) => set({ cookie, userId }),
      setPlaylists: (playlists) => set({ playlists }),
      clearSession: () => set({ cookie: '', userId: '', playlists: [] }),
    }),
    {
      name: 'netease-storage',
    }
  )
);
