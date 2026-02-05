import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetEaseState {
  cookie: string;
  userId: string;
  setSession: (cookie: string, userId: string) => void;
  clearSession: () => void;
}

export const useNetEaseStore = create<NetEaseState>()(
  persist(
    (set) => ({
      cookie: '',
      userId: '',
      setSession: (cookie, userId) => set({ cookie, userId }),
      clearSession: () => set({ cookie: '', userId: '' }),
    }),
    {
      name: 'netease-storage',
    }
  )
);
