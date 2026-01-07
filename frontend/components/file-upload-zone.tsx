"use client"

import type React from "react"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { uploadFile } from "@/lib/api"
import { buildTmpFileKey, formatFileSize, getFileType } from "@/lib/utils"
import { useFileStore } from "@/lib/file-store"
import { FileItem } from "@/lib/types"
import { nsfwDetector } from "@/lib/nsfw-detector"

export function FileUploadZone() {
  const addFileLocal = useFileStore((state) => state.addFileLocal)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 文件上传配置
  const uploadConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB - Telegram可分发的最大文件大小 
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
        toast({
          title: "文件大小超过限制",
          description: `文件超过${formatFileSize(uploadConfig.maxSize)}: ${invalid.map(f => f.name).join(', ')}`,
          variant: "destructive",
          duration: 5000,
        })
      }
      if (!valid.length) {
        toast({
          title: "没有符合条件的文件",
          variant: "destructive",
          duration: 5000,
        })
        return
      }


      // 上传状态
      let successCount = 0
      const failed: string[] = []
      const uploadProgressMap: Record<string, number> = {}
      setUploadProgress({})

      // 单个文件上传函数
      const uploadSingleFile = async (file: File) => {
        const tmpKey = buildTmpFileKey(file)
        uploadProgressMap[tmpKey] = 0
        setUploadProgress({ ...uploadProgressMap })

        try {
          // 对图片文件进行 NSFW 检测
          if (file.type.startsWith('image/')) {
            const isUnsafe = await nsfwDetector.detectImgFile(file);
            console.log("nsfwDetector detectFile result:", isUnsafe)
            
            if (isUnsafe) {
              // 检测到不适宜内容，阻止上传
              toast({
                title: "文件包含不适宜内容",
                description: "检测到NSFW",
                variant: "destructive",
                duration: 5000,
              });
              
              // return;
            }
          }

          const key = await uploadFile(file)
          uploadProgressMap[tmpKey] = 100
          setUploadProgress({ ...uploadProgressMap })

          // 获取文件类型
          const fileType = getFileType(file.type)

          // 添加到文件存储
          const fileItem : FileItem = {
            name: key,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              uploadedAt: Date.now(),
              liked: false,
            },
          }

          addFileLocal(fileItem, fileType)
          successCount++
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error)
          failed.push(`${file.name} (${(error as Error).message})`)
        } finally {
          // 移除进度显示
          setTimeout(() => {
            delete uploadProgressMap[tmpKey]
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
