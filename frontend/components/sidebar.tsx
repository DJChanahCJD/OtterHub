"use client"

import { Home, Clock, Trash2, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useFileStore } from "@/lib/store"
import { useState } from "react"

interface SidebarProps {
  isOpen: boolean
}

type ViewType = "files" | "recent" | "trash"

export function Sidebar({ isOpen }: SidebarProps) {
  const files = useFileStore((state) => state.files)
  const trashedFiles = useFileStore((state) => state.trashedFiles)
  const [activeView, setActiveView] = useState<ViewType>("files")

  if (!isOpen) return null

  // Calculate storage (mock data)
  const totalStorage = 1024 // MB
  const usedStorage = files.length * 2.5 // Approximate
  const storagePercent = Math.min((usedStorage / totalStorage) * 100, 100)

  // Emit custom event to change view
  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    const event = new CustomEvent("otterhub-view-change", { detail: { view } })
    window.dispatchEvent(event)
  }

  return (
    <aside className="w-64 border-r border-white/10 backdrop-blur-xl bg-white/5 p-4 overflow-y-auto">
      <nav className="space-y-2">
        <Button
          variant="ghost"
          className={`w-full justify-start ${activeView === "files" ? "bg-emerald-500/20 text-emerald-300" : "text-white hover:bg-white/10"}`}
          onClick={() => handleViewChange("files")}
        >
          <Home className="h-4 w-4 mr-3" />
          My Resources
        </Button>

        <Button
          variant="ghost"
          className={`w-full justify-start ${activeView === "recent" ? "bg-emerald-500/20 text-emerald-300" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          onClick={() => handleViewChange("recent")}
        >
          <Clock className="h-4 w-4 mr-3" />
          Recent
        </Button>

        <Button
          variant="ghost"
          className={`w-full justify-start ${activeView === "trash" ? "bg-emerald-500/20 text-emerald-300" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          onClick={() => handleViewChange("trash")}
        >
          <Trash2 className="h-4 w-4 mr-3" />
          Trash
          {trashedFiles.length > 0 && (
            <span className="ml-auto text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
              {trashedFiles.length}
            </span>
          )}
        </Button>
      </nav>

      {/* Storage Info */}
      <div className="mt-8 p-4 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">Storage</span>
        </div>

        <Progress value={storagePercent} className="h-2 mb-2" />

        <p className="text-xs text-white/60">
          {usedStorage.toFixed(1)} MB of {totalStorage} MB used
        </p>
      </div>

      {/* File Type Counts */}
      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">File Types</p>

        {[
          { type: "Images", count: files.filter((f) => f.type === "image").length, color: "text-blue-400" },
          { type: "Audio", count: files.filter((f) => f.type === "audio").length, color: "text-emerald-400" },
          { type: "Videos", count: files.filter((f) => f.type === "video").length, color: "text-purple-400" },
          { type: "Documents", count: files.filter((f) => f.type === "document").length, color: "text-amber-400" },
        ].map((item) => (
          <div key={item.type} className="flex items-center justify-between text-sm">
            <span className="text-white/60">{item.type}</span>
            <span className={`font-medium ${item.color}`}>{item.count}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
