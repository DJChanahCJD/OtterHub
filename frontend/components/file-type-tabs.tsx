"use client"

import { ImageIcon, Music, Video, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileStore } from "@/lib/store"

const fileTypes = [
  { id: "all", label: "All", icon: null },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music },
  { id: "video", label: "Videos", icon: Video },
  { id: "document", label: "Documents", icon: FileText },
] as const

export function FileTypeTabs() {
  const activeFilter = useFileStore((state) => state.activeFilter)
  const setActiveFilter = useFileStore((state) => state.setActiveFilter)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {fileTypes.map((type) => {
        const Icon = type.icon
        const isActive = activeFilter === type.id

        return (
          <Button
            key={type.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveFilter(type.id)}
            className={`
              transition-all duration-200
              ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }
            `}
          >
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            {type.label}
          </Button>
        )
      })}
    </div>
  )
}
