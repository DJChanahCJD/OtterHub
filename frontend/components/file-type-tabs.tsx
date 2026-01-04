"use client"

import { ImageIcon, Music, Video, FileText, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileStore } from "@/lib/file-store"
import { FileType } from "@/lib/types"

const fileTypes = [
  { id: FileType.Image, label: "Images", icon: ImageIcon },
  { id: FileType.Audio, label: "Audio", icon: Music },
  { id: FileType.Video, label: "Videos", icon: Video },
  { id: FileType.Document, label: "Documents", icon: FileText },
] as const

export function FileTypeTabs() {
  const activeType = useFileStore((state) => state.activeType)
  const setActiveType = useFileStore((state) => state.setActiveType)

  console.log(activeType)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {fileTypes.map((type) => {
        const Icon = type.icon
        const isActive = activeType === type.id

        return (
          <Button
            key={type.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveType(type.id)}
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
