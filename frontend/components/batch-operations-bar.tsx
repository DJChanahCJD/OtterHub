"use client";

import { Download, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveItems, useFileStore } from "@/lib/file-store";
import { deleteFile, getFileUrl } from "@/lib/api";
import { downloadFile } from "@/lib/utils";
import { useToast } from "./ui/use-toast";

export function BatchOperationsBar() {
  const fileStore = useFileStore()
  const selectedKeys = fileStore.selectedKeys
  const clearSelection = fileStore.clearSelection
  const { toast } = useToast()


  const items = useActiveItems()
  const handleBatchDownload = () => {
    selectedKeys.forEach((name) => {
      const file = items.find((f) => f.name === name)
      if (!file) return

      downloadFile(getFileUrl(name), file.metadata.fileName)
    })
  }
  const handleBatchDelete = async () => {
    if (!confirm(`确认删除这 ${selectedKeys.length} 个文件？`)) return
    selectedKeys.forEach(async (key) => {
      await deleteFile(key).then((success) => {
        if (success) {
          fileStore.deleteFilesLocal([key])
        } else {
          toast({
            title: "删除失败",
            description: `${key} 删除失败`,
          })
        }
      })
    })
    clearSelection()
  } 

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="backdrop-blur-xl bg-linear-to-r from-emerald-500/90 to-teal-500/90 border border-white/20 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4">
          <span className="text-sm font-medium text-white">
            {selectedKeys.length}{" "}
            {selectedKeys.length === 1 ? "file" : "files"} selected
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={handleBatchDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-2 text-red-500" />
              Delete
            </Button>

            <div className="w-px h-6 bg-white/20" />

            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
