import { create } from "zustand"

export type FileType = "image" | "audio" | "video" | "document"
export type FilterType = "all" | FileType

export interface FileItem {
  id: string
  name: string
  type: FileType
  size: number
  uploadedAt: Date
  thumbnailUrl?: string
  url: string
  metadata?: {
    duration?: number
    dimensions?: { width: number; height: number }
    artist?: string
    album?: string
  }
}

interface FileStore {
  files: FileItem[]
  trashedFiles: FileItem[]
  selectedFiles: string[]
  activeFilter: FilterType
  viewMode: "grid" | "list"

  addFile: (file: FileItem) => void
  removeFile: (id: string) => void
  moveToTrash: (id: string) => void
  restoreFromTrash: (id: string) => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setActiveFilter: (filter: FilterType) => void
  setViewMode: (mode: "grid" | "list") => void
}

export const useFileStore = create<FileStore>((set) => ({
  files: [],
  trashedFiles: [],
  selectedFiles: [],
  activeFilter: "all",
  viewMode: "grid",

  addFile: (file) => set((state) => ({ files: [...state.files, file] })),

  removeFile: (id) =>
    set((state) => ({
      trashedFiles: state.trashedFiles.filter((f) => f.id !== id),
    })),

  moveToTrash: (id) =>
    set((state) => {
      const file = state.files.find((f) => f.id === id)
      if (!file) return state
      return {
        files: state.files.filter((f) => f.id !== id),
        trashedFiles: [...state.trashedFiles, file],
        selectedFiles: state.selectedFiles.filter((fid) => fid !== id),
      }
    }),

  restoreFromTrash: (id) =>
    set((state) => {
      const file = state.trashedFiles.find((f) => f.id === id)
      if (!file) return state
      return {
        trashedFiles: state.trashedFiles.filter((f) => f.id !== id),
        files: [...state.files, file],
      }
    }),

  toggleSelection: (id) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(id)
        ? state.selectedFiles.filter((fid) => fid !== id)
        : [...state.selectedFiles, id],
    })),

  selectAll: () =>
    set((state) => ({
      selectedFiles: state.files.map((f) => f.id),
    })),

  clearSelection: () => set({ selectedFiles: [] }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),

  setViewMode: (mode) => set({ viewMode: mode }),
}))
