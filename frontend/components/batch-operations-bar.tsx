"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveItems, useFileStore } from "@/lib/store";
import { getFileUrl } from "@/lib/api";
import { downloadFile } from "@/lib/utils";

export function BatchOperationsBar() {
  const selectedKeys = useFileStore((s) => s.selectedKeys)
  const clearSelection = useFileStore((s) => s.clearSelection)

  const items = useActiveItems()
  const handleDownloadAll = () => {
    selectedKeys.forEach((name) => {
      const file = items.find((f) => f.name === name)
      if (!file) return

      downloadFile(getFileUrl(file.name), file.metadata.fileName)
    })
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
              onClick={handleDownloadAll}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
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
