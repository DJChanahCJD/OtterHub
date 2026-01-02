"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { FileUploadZone } from "@/components/file-upload-zone"
import { FileGrid } from "@/components/file-grid"
import { BatchOperationsBar } from "@/components/batch-operations-bar"
import { EmptyState } from "@/components/empty-state"
import { TrashView } from "@/components/trash-view"
import { useFileStore, type FileType } from "@/lib/store"

type ViewType = "files" | "recent" | "trash"

export default function OtterHubPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>("files")

  const files = useFileStore((state) => state.files)
  const selectedFiles = useFileStore((state) => state.selectedFiles)
  const addFile = useFileStore((state) => state.addFile)

  useEffect(() => {
    const handleUploadEvent = (e: CustomEvent) => {
      const files = e.detail.files as FileList

      Array.from(files).forEach((file) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const detectFileType = (mimeType: string): FileType => {
          if (mimeType.startsWith("image/")) return "image"
          if (mimeType.startsWith("audio/")) return "audio"
          if (mimeType.startsWith("video/")) return "video"
          return "document"
        }

        const fileType = detectFileType(file.type)
        const fileUrl = URL.createObjectURL(file)

        addFile({
          id: fileId,
          name: file.name,
          type: fileType,
          size: file.size,
          uploadedAt: new Date(),
          url: fileUrl,
          thumbnailUrl: fileType === "image" ? fileUrl : undefined,
        })
      })
    }

    const handleViewChange = (e: CustomEvent) => {
      setCurrentView(e.detail.view)
    }

    window.addEventListener("otterhub-upload", handleUploadEvent as EventListener)
    window.addEventListener("otterhub-view-change", handleViewChange as EventListener)

    return () => {
      window.removeEventListener("otterhub-upload", handleUploadEvent as EventListener)
      window.removeEventListener("otterhub-view-change", handleViewChange as EventListener)
    }
  }, [addFile])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d2137] to-[#134e4a] text-white overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} />

          <main className="flex-1 overflow-auto p-6 md:p-8">
            {currentView === "trash" ? (
              <TrashView />
            ) : (
              <>
                {currentView === "files" && <FileUploadZone />}

                {files.length === 0 && currentView === "files" ? <EmptyState /> : <FileGrid />}
              </>
            )}
          </main>
        </div>

        {selectedFiles.length > 0 && currentView !== "trash" && <BatchOperationsBar />}
      </div>
    </div>
  )
}
