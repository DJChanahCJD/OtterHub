"use client"

import { useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FileUploadZone } from "@/components/upload/file-upload-zone"
import { FileGrid } from "@/components/file-grid"
import { BatchOperationsBar } from "@/components/batch-operations-bar"
import { EmptyState } from "@/components/empty-state"
import { useActiveItems, useFileStore } from "@/lib/file-store"

export default function OtterHubPage() {
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
    <div className="relative min-h-screen bg-linear-to-br from-[#0a1628] via-[#0d2137] to-[#134e4a] text-white">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header/>

        <div className="flex-1">
          {/* <Sidebar isOpen={sidebarOpen} /> */}

          <main className="p-6 md:p-8">
            <FileUploadZone />

            {activeItems.length === 0 ? <EmptyState /> : <FileGrid />}
          </main>
        </div>

        {selectedKeys.length > 0 && <BatchOperationsBar />}

        <Footer />
      </div>
    </div>
  )
}
