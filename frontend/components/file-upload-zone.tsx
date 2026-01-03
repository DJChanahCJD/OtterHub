"use client"

import type React from "react"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { uploadFile } from "@/lib/api"
import { getFileType } from "@/lib/utils"
import { useFileStore } from "@/lib/store"

export function FileUploadZone() {
  const addFile = useFileStore((state) => state.addFile)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 文件上传配置
  const uploadConfig = {
    maxSize: 20 * 1024 * 1024, // 20MB - Telegram可分发的最大文件大小
    maxConcurrent: 3, // 最大并发上传数
  }

  const processFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files)
      if (!fileArray.length) return

      // 文件验证
      const valid: File[] = []
      const invalid: File[] = []

      fileArray.forEach(file => {
        (file.size <= uploadConfig.maxSize ? valid : invalid).push(file)
      })

      // 显示错误信息
      if (invalid.length) {
        alert(`文件超过${uploadConfig.maxSize / 1024 / 1024}MB: \n${invalid.map(f => f.name).join('\n')}`)
      }
      if (!valid.length) {
        alert('没有符合条件的文件')
        return
      }

      // 确认上传
      const confirmed = confirm(`确定要上传这 ${valid.length} 个文件吗?`)
      if (!confirmed) return

      // 上传状态
      let successCount = 0
      const failed: string[] = []
      const uploadProgressMap: Record<string, number> = {}
      setUploadProgress({})

      // 单个文件上传函数
      const uploadSingleFile = async (file: File) => {
        const tmpId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        uploadProgressMap[tmpId] = 0
        setUploadProgress({ ...uploadProgressMap })

        try {
          await uploadFile(file)
          uploadProgressMap[tmpId] = 100
          setUploadProgress({ ...uploadProgressMap })

          // 获取文件类型
          const fileType = getFileType(file.type)

          // 添加到文件存储
          const fileItem = {
            name: file.name,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              uploadedAt: Date.now(),
            },
          }

          addFile(fileItem, fileType)
          successCount++
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error)
          failed.push(`${file.name} (${(error as Error).message})`)
        } finally {
          // 移除进度显示
          setTimeout(() => {
            delete uploadProgressMap[tmpId]
            setUploadProgress({ ...uploadProgressMap })
          }, 500)
        }
      }

      // 分批上传
      for (let i = 0; i < valid.length; i += uploadConfig.maxConcurrent) {
        const batch = valid.slice(i, i + uploadConfig.maxConcurrent)
        await Promise.all(batch.map(uploadSingleFile))
      }

      // 显示上传结果
      if (successCount > 0) {
        alert(`成功上传 ${successCount} 个文件`)
      }
      if (failed.length > 0) {
        alert(`上传失败: ${failed.join(', ')}`)
      }
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
