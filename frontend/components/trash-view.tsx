"use client"

import { useState } from "react"
import { RotateCcw, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileStore } from "@/lib/store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function TrashView() {
  const trashedFiles = useFileStore((state) => state.trashedFiles)
  const restoreFromTrash = useFileStore((state) => state.restoreFromTrash)
  const removeFile = useFileStore((state) => state.removeFile)

  const [fileToDelete, setFileToDelete] = useState<string | null>(null)

  const handlePermanentDelete = () => {
    if (fileToDelete) {
      removeFile(fileToDelete)
      setFileToDelete(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Mock: Calculate days until deletion (would be based on actual deletion date)
  const getDaysRemaining = () => 30

  if (trashedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-32 h-32 mb-6 opacity-50 flex items-center justify-center">
          <Trash2 className="h-24 w-24 text-white/20" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2">Trash is empty</h3>
        <p className="text-white/60 max-w-md">
          Files you delete will appear here for 30 days before being permanently removed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-300">Files in trash will be permanently deleted after 30 days</p>
          <p className="text-xs text-amber-400/80 mt-1">Restore files before they are permanently removed.</p>
        </div>
      </div>

      <div className="space-y-2">
        {trashedFiles.map((file) => (
          <div
            key={file.id}
            className="group flex items-center gap-4 p-4 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 hover:border-red-400/30 hover:bg-white/10 transition-all"
          >
            {/* File Icon */}
            <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-2xl">
              {file.type === "image" && "🖼️"}
              {file.type === "audio" && "🎵"}
              {file.type === "video" && "🎬"}
              {file.type === "document" && "📄"}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
            </div>

            {/* Days Remaining */}
            <div className="hidden md:block">
              <span className="text-xs text-red-400/80">{getDaysRemaining()} days remaining</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => restoreFromTrash(file.id)}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFileToDelete(file.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Forever
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent className="bg-[#0d2137] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Permanently delete this file?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This action cannot be undone. This file will be permanently deleted from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
