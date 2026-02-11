import { create } from 'zustand';
import { FileItem } from '@shared/types';

export type PreviewType = 'audio' | 'video' | 'text';
export type ViewState = 'full' | 'minimized';

export interface PreviewItemState {
  file: FileItem;
  viewState: ViewState;
}

interface PreviewState {
  audio: PreviewItemState | null;
  video: PreviewItemState | null;
  text: PreviewItemState | null;

  openPreview: (file: FileItem, type: PreviewType) => void;
  minimize: (type: PreviewType) => void;
  maximize: (type: PreviewType) => void;
  close: (type: PreviewType) => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  audio: null,
  video: null,
  text: null,

  openPreview: (file, type) => set((state) => ({
    [type]: { file, viewState: 'full' }
  })),

  minimize: (type) => set((state) => {
    const current = state[type];
    if (!current) return {};
    return { [type]: { ...current, viewState: 'minimized' } };
  }),

  maximize: (type) => set((state) => {
    const current = state[type];
    if (!current) return {};
    return { [type]: { ...current, viewState: 'full' } };
  }),

  close: (type) => set((state) => ({
    [type]: null
  })),
}));
