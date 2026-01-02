"use client"

import type React from "react"

import { useState } from "react"
import { MoreVertical, Download, Trash2, ImageIcon, Music, Video, FileText, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFileStore, type FileItem } from "@/lib/store"
import { cn } from "@/lib/utils"

interface FileCardProps {
  file: FileItem
  listView?: boolean
}

export function FileCard({ file, listView = false }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const selectedFiles = useFileStore((state) => state.selectedFiles)
  const toggleSelection = useFileStore((state) => state.toggleSelection)
  const moveToTrash = useFileStore((state) => state.moveToTrash)

  const isSelected = selectedFiles.includes(file.id)

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSelection(file.id)
  }

  const handleDelete = () => {
    moveToTrash(file.id)
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = file.url
    link.download = file.name
    link.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = () => {
    switch (file.type) {
      case "image":
        return ImageIcon
      case "audio":
        return Music
      case "video":
        return Video
      case "document":
        return FileText
    }
  }

  const FileIcon = getFileIcon()

  if (listView) {
    return (
      <div
        className={cn(
          "group flex items-center gap-4 p-4 rounded-lg backdrop-blur-xl border transition-all cursor-pointer",
          isSelected
            ? "bg-emerald-500/20 border-emerald-400/50"
            : "bg-white/5 border-white/10 hover:border-emerald-400/30 hover:bg-white/10",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
      >
        {/* Checkbox */}
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-emerald-500 border-emerald-500" : "border-white/30 group-hover:border-emerald-400/50",
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>

        {/* File Icon/Preview */}
        <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
          {file.type === "image" && file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl || "/placeholder.svg"}
              alt={file.name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <FileIcon className="h-6 w-6 text-emerald-400" />
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.name}</p>
          <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
        </div>

        {/* Date */}
        <div className="hidden md:block text-xs text-white/40">{file.uploadedAt.toLocaleDateString()}</div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-white/60 hover:text-white hover:bg-white/10",
                !isHovered && "opacity-0 group-hover:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0d2137] border-white/10">
            <DropdownMenuItem onClick={handleDownload} className="text-white hover:bg-white/10">
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-red-500/10">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden backdrop-blur-xl border transition-all cursor-pointer",
        isSelected
          ? "bg-emerald-500/20 border-emerald-400/50 ring-2 ring-emerald-400/50"
          : "bg-white/10 border-white/10 hover:border-emerald-400/50",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelect}
    >
      {/* Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all backdrop-blur-sm",
            isSelected
              ? "bg-emerald-500 border-emerald-500"
              : "bg-black/40 border-white/30 opacity-0 group-hover:opacity-100",
          )}
        >
          {isSelected && <Check className="h-4 w-4 text-white" />}
        </div>
      </div>

      {/* Actions Menu */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 h-8 w-8",
                !isHovered && "opacity-0 group-hover:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0d2137] border-white/10">
            <DropdownMenuItem onClick={handleDownload} className="text-white hover:bg-white/10">
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-red-500/10">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {file.type === "image" && file.thumbnailUrl ? (
          <img src={file.thumbnailUrl || "/placeholder.svg"} alt={file.name} className="w-full h-full object-cover" />
        ) : file.type === "video" ? (
          <div className="relative w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Video className="h-12 w-12 text-purple-300" />
          </div>
        ) : file.type === "audio" ? (
          <div className="relative w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Music className="h-12 w-12 text-emerald-300" />
          </div>
        ) : (
          <div className="relative w-full h-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <FileText className="h-12 w-12 text-amber-300" />
          </div>
        )}
      </div>

      {/* File Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
        <p className="text-sm font-medium text-white truncate">{file.name}</p>
        <p className="text-xs text-white/60">{formatFileSize(file.size)}</p>
      </div>
    </div>
  )
}
