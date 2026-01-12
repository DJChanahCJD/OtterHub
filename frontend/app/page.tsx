"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { FileUploadZone } from "@/components/upload/file-upload-zone"
import { FileGrid } from "@/components/file-grid"
import { BatchOperationsBar } from "@/components/batch-operations-bar"
import { EmptyState } from "@/components/empty-state"
import { useActiveItems, useFileStore } from "@/lib/file-store"

export default function OtterHubPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activeItems = useActiveItems()
  const selectedKeys = useFileStore((state) => state.selectedKeys)
  const fetchNextPage = useFileStore((state) => state.fetchNextPage)

  // 从后端获取文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        await fetchNextPage()
      } catch (error) {
        console.error("Error fetching files:", error)
      }
    }
    fetchFiles()
  }, [])

  return (
    <div className="relative min-h-screen bg-linear-to-br from-[#0a1628] via-[#0d2137] to-[#134e4a] text-white overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        <Header/>

        <div className="flex flex-1 overflow-hidden">
          {/* <Sidebar isOpen={sidebarOpen} /> */}

          <main className="flex-1 overflow-auto p-6 md:p-8">
            <FileUploadZone />

            {activeItems.length === 0 ? <EmptyState /> : <FileGrid />}
          </main>
        </div>

        {selectedKeys.length > 0 && <BatchOperationsBar />}
      </div>
    </div>
  )
}
