"use client"

import { Download, Trash2, X } from "lucide-react"
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
import { useState } from "react"

export function BatchOperationsBar() {
  const selectedFiles = useFileStore((state) => state.selectedFiles)
  const clearSelection = useFileStore((state) => state.clearSelection)
  const files = useFileStore((state) => state.files)
  const moveToTrash = useFileStore((state) => state.moveToTrash)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDownloadAll = () => {
    selectedFiles.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId)
      if (file) {
        const link = document.createElement("a")
        link.href = file.url
        link.download = file.name
        link.click()
      }
    })
  }

  const handleDeleteAll = () => {
    selectedFiles.forEach((fileId) => {
      moveToTrash(fileId)
    })
    clearSelection()
    setShowDeleteDialog(false)
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="backdrop-blur-xl bg-gradient-to-r from-emerald-500/90 to-teal-500/90 border border-white/20 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4">
          <span className="text-sm font-medium text-white">
            {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
          </span>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={handleDownloadAll}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            <div className="w-px h-6 bg-white/20" />

            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#0d2137] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete {selectedFiles.length} files?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              These files will be moved to trash and can be restored within 30 days. After 30 days, they will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-red-500 hover:bg-red-600 text-white border-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
