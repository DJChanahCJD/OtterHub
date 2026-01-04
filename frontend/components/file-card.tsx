"use client"

import type React from "react"

import { useMemo } from "react"
import { MoreVertical, Download, Trash2, ImageIcon, Music, Video, FileText, Check, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFileStore } from "@/lib/store"
import { cn, getFileTypeFromKey, formatFileSize, downloadFile } from "@/lib/utils"
import { FileItem, FileType } from "@/lib/types"
import { getFileUrl } from "@/lib/api"

interface FileCardProps {
  file: FileItem
  activeType?: FileType
  listView?: boolean
}

// 文件类型到图标的映射
const FILE_TYPE_ICON_MAP: Record<FileType, React.FC<any>> = {
  [FileType.Image]: ImageIcon,
  [FileType.Audio]: Music,
  [FileType.Video]: Video,
  [FileType.Document]: FileText,
}

// 文件操作菜单组件
function FileActions({
  onDownload,
  onDelete,
}: {
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0d2137] border-white/10">
        <DropdownMenuItem onClick={onDownload} className="text-white hover:bg-white/10">
          <Download className="h-4 w-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:bg-red-500/10">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FileCard({ file, listView = false }: FileCardProps) {
  const selectedKeys = useFileStore((state) => state.selectedKeys)
  const toggleSelection = useFileStore((state) => state.toggleSelection)
  const deleteFile = useFileStore((state) => state.deleteFile)

  const isSelected = selectedKeys.includes(file.name)

  // 只计算一次文件类型，提高性能
  const fileType = useMemo(
    () => getFileTypeFromKey(file.name),
    [file.name]
  )

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSelection(file.name)
  }

  const handleDelete = () => {
    const confirmDelete = confirm(`确定要删除文件 ${file.metadata.fileName} 吗?`)
    if (!confirmDelete) return
    deleteFile(file.name)
  }

  const handleDownload = () => {
    const url = getFileUrl(file.name)
    downloadFile(url, file.metadata.fileName)
  }

  if (listView) {
    return (
      <div
        className={cn(
          "group flex items-center gap-4 p-4 rounded-lg backdrop-blur-xl border transition-all cursor-pointer",
          isSelected
            ? "bg-emerald-500/20 border-emerald-400/50"
            : "bg-white/5 border-white/10 hover:border-emerald-400/30 hover:bg-white/10",
        )}
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
        <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center shrink-0">
          {fileType === FileType.Image ? (
            <img
              src={getFileUrl(file.name)}
              alt={file.name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <File className="h-6 w-6 text-emerald-400" />
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.metadata.fileName}</p>
          <p className="text-xs text-white/40">{formatFileSize(file.metadata.fileSize || 0)}</p>
        </div>

        {/* Date */}
        <div className="hidden md:block text-xs text-white/40">{file.metadata.uploadedAt?.toLocaleString() || "N/A"}</div>

        {/* Actions */}
        <FileActions onDownload={handleDownload} onDelete={handleDelete} />
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
        <FileActions onDownload={handleDownload} onDelete={handleDelete} />
      </div>

      {/* File Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {fileType === FileType.Image ? (
          <img src={getFileUrl(file.name)} alt={file.name} className="w-full h-full object-cover" />
        ) : fileType === FileType.Video ? (
          <div className="relative w-full h-full bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Video className="h-12 w-12 text-purple-300" />
          </div>
        ) : fileType === FileType.Audio ? (
          <div className="relative w-full h-full bg-linear-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Music className="h-12 w-12 text-emerald-300" />
          </div>
        ) : (
          <div className="relative w-full h-full bg-linear-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <FileText className="h-12 w-12 text-amber-300" />
          </div>
        )}
      </div>

      {/* File Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/80 via-black/60 to-transparent">
        <p className="text-sm font-medium text-white truncate">{file.metadata.fileName || file.name}</p>
        <p className="text-xs text-white/60">{formatFileSize(file.metadata.fileSize || 0)}</p>
      </div>
    </div>
  )
}
