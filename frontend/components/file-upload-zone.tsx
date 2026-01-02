"use client"

import type React from "react"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { useFileStore, type FileType } from "@/lib/store"
import { Progress } from "@/components/ui/progress"

export function FileUploadZone() {
  const addFile = useFileStore((state) => state.addFile)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectFileType = (mimeType: string): FileType => {
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("video/")) return "video"
    return "document"
  }

  const processFiles = useCallback(
    async (files: FileList) => {
      Array.from(files).forEach((file) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Simulate upload progress
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setUploadProgress((prev) => ({ ...prev, [fileId]: progress }))

          if (progress >= 100) {
            clearInterval(interval)

            // Create file object and add to store
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

            // Remove from progress
            setTimeout(() => {
              setUploadProgress((prev) => {
                const updated = { ...prev }
                delete updated[fileId]
                return updated
              })
            }, 500)
          }
        }, 200)
      })
    },
    [addFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        processFiles(files)
      }
    },
    [processFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        processFiles(files)
      }
    },
    [processFiles],
  )

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const uploadingFiles = Object.keys(uploadProgress)

  return (
    <div className="mb-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center 
          transition-all cursor-pointer backdrop-blur-sm bg-white/5
          ${
            isDragging
              ? "border-emerald-400 bg-emerald-400/10 scale-[1.02]"
              : "border-white/20 hover:border-emerald-400/50"
          }
        `}
      >
        <Upload
          className={`h-8 w-8 mx-auto mb-3 transition-colors ${isDragging ? "text-emerald-400" : "text-white/40"}`}
        />
        <p className="text-sm text-white/60 mb-1">
          {isDragging ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-white/40">Supports Images, Audio, Videos, and Documents</p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((fileId) => (
            <div key={fileId} className="backdrop-blur-sm bg-white/10 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">Uploading...</span>
                <span className="text-xs text-emerald-300">{uploadProgress[fileId]}%</span>
              </div>
              <Progress value={uploadProgress[fileId]} className="h-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
