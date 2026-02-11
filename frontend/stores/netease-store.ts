import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NetEaseProfile {
  nickname: string;
  avatarUrl: string;
  backgroundUrl: string;
  signature: string;
}

interface NetEaseState {
  cookie: string;
  userId: string;
  playlists: any[];
  recommendPlaylists: any[];
  profile: NetEaseProfile | null;
  setSession: (cookie: string, userId: string, profile: NetEaseProfile) => void;
  setPlaylists: (playlists: any[]) => void;
  setRecommendPlaylists: (playlists: any[]) => void;
  clearSession: () => void;
}

export const useNetEaseStore = create<NetEaseState>()(
  persist(
    (set) => ({
      cookie: '',
      userId: '',
      playlists: [],
      recommendPlaylists: [],
      profile: null,
      setSession: (cookie, userId, profile) => set({ cookie, userId, profile }),
      setPlaylists: (playlists) => set({ playlists }),
      setRecommendPlaylists: (recommendPlaylists) => set({ recommendPlaylists }),
      clearSession: () => set({ cookie: '', userId: '', playlists: [], recommendPlaylists: [], profile: null }),
    }),
    {
      name: 'netease-storage',
      partialize: (state) => ({
        cookie: state.cookie,
        userId: state.userId,
        playlists: state.playlists,
        profile: state.profile,
      }),
    }
  )
);
