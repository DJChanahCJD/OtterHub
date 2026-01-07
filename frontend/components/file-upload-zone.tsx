"use client"

import type React from "react"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { uploadChunk, uploadChunkInit, uploadFile } from "@/lib/api"
import { buildTmpFileKey, formatFileSize, getFileType } from "@/lib/utils"
import { useFileStore } from "@/lib/file-store"
import { FileItem, MAX_CONCURRENT_UPLOADS, MAX_FILE_SIZE, FileTag } from "@/lib/types"
import { nsfwDetector } from "@/lib/nsfw-detector"

export function FileUploadZone() {
  const addFileLocal = useFileStore((state) => state.addFileLocal)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const processFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files)
      if (!fileArray.length) return

      // 支持任意大小文件，小文件走普通上传，大文件走分片上传

      // 上传状态
      let successCount = 0
      const failed: string[] = []
      const uploadProgressMap: Record<string, number> = {}
      setUploadProgress({})

      // 普通上传 (≤ MAX_FILE_SIZE)
      const uploadNormalFile = async (file: File) => {
        const tmpKey = buildTmpFileKey(file)
        uploadProgressMap[tmpKey] = 0
        setUploadProgress({ ...uploadProgressMap })

        try {
          // 对图片文件进行 NSFW 检测, 非图片文件直接返回 false
          const isUnsafe = await nsfwDetector.isUnsafeImg(file)
          const key = await uploadFile(file, isUnsafe)

          uploadProgressMap[tmpKey] = 100
          setUploadProgress({ ...uploadProgressMap })

          return { key, fileType: getFileType(file.type), isUnsafe }
        } catch (error) {
          throw new Error(`${file.name}: ${(error as Error).message}`)
        } finally {
          setTimeout(() => {
            delete uploadProgressMap[tmpKey]
            setUploadProgress({ ...uploadProgressMap })
          }, 500)
        }
      }

      // 分片上传 (> MAX_FILE_SIZE)
      const uploadChunkedFile = async (file: File) => {
        const tmpKey = buildTmpFileKey(file)
        uploadProgressMap[tmpKey] = 0
        setUploadProgress({ ...uploadProgressMap })

        try {
          const fileType = getFileType(file.type)
          const totalChunks = Math.ceil(file.size / MAX_FILE_SIZE)  // 总分片数

          // 1. 初始化分片上传
          const key = await uploadChunkInit(fileType, file.name, file.size, totalChunks)

          // 2. 按 MAX_FILE_SIZE 分片上传
          for (let i = 0; i < totalChunks; i++) {
            const start = i * MAX_FILE_SIZE
            const end = Math.min(start + MAX_FILE_SIZE, file.size)
            const chunkFile = file.slice(start, end)

            await uploadChunk(key, i, chunkFile)

            // 更新进度
            uploadProgressMap[tmpKey] = Math.round(((i + 1) / totalChunks) * 100)
            setUploadProgress({ ...uploadProgressMap })
          }

          return { key, fileType, isUnsafe: false } //  大文件不做nsfw检测
        } catch (error) {
          throw new Error(`${file.name}: ${(error as Error).message}`)
        } finally {
          setTimeout(() => {
            delete uploadProgressMap[tmpKey]
            setUploadProgress({ ...uploadProgressMap })
          }, 500)
        }
      }

      // 单个文件上传入口
      const uploadSingleFile = async (file: File) => {
        try {
          const { key, fileType, isUnsafe } = file.size > MAX_FILE_SIZE
            ? await uploadChunkedFile(file)
            : await uploadNormalFile(file)

          // 添加到文件存储
          const fileItem: FileItem = {
            name: key,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              uploadedAt: Date.now(),
              liked: false,
              tags: isUnsafe ? [FileTag.NSFW] : [],
            },
          }

          addFileLocal(fileItem, fileType)
          successCount++
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error)
          failed.push((error as Error).message)
        }
      }

      // 分批上传
      for (let i = 0; i < fileArray.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = fileArray.slice(i, i + MAX_CONCURRENT_UPLOADS)
        await Promise.all(batch.map(uploadSingleFile))
      }

      // 显示上传结果
      if (successCount > 0) {
        toast({
          title: "上传成功",
          description: `成功上传 ${successCount} 个文件`,
          variant: "default",
        })
      }
      if (failed.length > 0) {
        toast({
          title: "部分文件上传失败",
          description: failed.join(', '),
          variant: "destructive",
        })
      }
    },
    [addFileLocal, toast],
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
