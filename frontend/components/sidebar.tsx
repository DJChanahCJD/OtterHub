"use client"

import { Home, Trash2, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useFileStore } from "@/lib/file-store"
import { FileType } from "@/lib/types"

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  if (!isOpen) return null

  /* ---------- File type counts ---------- */
  const buckets = useFileStore((s) => s.buckets)

  const imageCount = buckets[FileType.Image].items.length
  const audioCount = buckets[FileType.Audio].items.length
  const videoCount = buckets[FileType.Video].items.length
  const docCount   = buckets[FileType.Document].items.length


  return (
    <aside className="w-64 border-r border-white/10 backdrop-blur-xl bg-white/5 p-4 overflow-y-auto">
      {/* -------- Navigation -------- */}
      <nav className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start bg-emerald-500/20 text-emerald-300"
        >
          <Home className="h-4 w-4 mr-3" />
          My Resources
        </Button>

      </nav>

      {/* -------- File Types -------- */}
      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
          File Types
        </p>

        <FileTypeRow label="Images" count={imageCount} color="text-blue-400" />
        <FileTypeRow label="Audio" count={audioCount} color="text-emerald-400" />
        <FileTypeRow label="Videos" count={videoCount} color="text-purple-400" />
        <FileTypeRow label="Documents" count={docCount} color="text-amber-400" />
      </div>
    </aside>
  )
}

/* ---------- Small presentational helper ---------- */
function FileTypeRow({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className={`font-medium ${color}`}>{count}</span>
    </div>
  )
}
