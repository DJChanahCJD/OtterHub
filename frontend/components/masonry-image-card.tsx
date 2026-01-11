"use client"

import { useFileStore } from "@/lib/file-store"
import { BrowseMode, FileItem, FileTag } from "@/lib/types"
import { getFileUrl } from "@/lib/api"
import { PhotoView } from "react-photo-view"
import { Image } from "lucide-react"
import { ICON_DISPLAY_SIZE, SMART_NO_IMAGE_THRESHOLD } from "./file-card"

interface MasonryImageCardProps {
  file: FileItem
}

export function MasonryImageCard({ file }: MasonryImageCardProps) {
  const safeMode = useFileStore((state) => state.safeMode)
  const browseMode = useFileStore((state) => state.browseMode)
  const isNSFW = file.metadata?.tags?.includes(FileTag.NSFW) || false
  const shouldBlur = safeMode && isNSFW

  // 判断是否应该加载图片
  const shouldLoadImage = () => {
    if (browseMode === BrowseMode.NoImage) return false
    if (browseMode === BrowseMode.SmartNoImage && file.metadata.fileSize && file.metadata.fileSize > SMART_NO_IMAGE_THRESHOLD) {
      return false
    }
    return true
  }

  const imageUrl = getFileUrl(file.name)

  return (
    <div className="relative group rounded-xl overflow-hidden bg-white/10 border border-white/10">
      {/* PhotoView 包裹的图片 */}
      {!shouldBlur && shouldLoadImage() ? (
        <PhotoView src={imageUrl}>
          <img
            src={imageUrl}
            alt={file.metadata.fileName}
            className="w-full cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
          />
        </PhotoView>
      ) : (
        <div className="flex items-center justify-center aspect-square bg-white/5">
          {!shouldLoadImage() ? (
            <Image className={`${ICON_DISPLAY_SIZE} text-white/40`} />
          ) : (
            <img
              src={imageUrl}
              alt={file.metadata.fileName}
              className="w-full blur-xl"
            />
          )}
        </div>
      )}

      {/* NSFW 提示 */}
      {shouldBlur && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <span className="text-sm font-medium text-amber-300">NSFW Content</span>
        </div>
      )}

      {/* 底部文件名悬浮 */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{file.metadata.fileName}</p>
      </div>
    </div>
  )
}
