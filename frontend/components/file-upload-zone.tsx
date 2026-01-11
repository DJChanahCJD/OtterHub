"use client"

import type React from "react"

import { useCallback, useRef, useState } from "react"
import { Upload, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { uploadChunk, uploadChunkInit, uploadFile, checkIncompleteUpload } from "@/lib/api"
import { buildTmpFileKey, formatFileSize, getFileType } from "@/lib/utils"
import { useFileStore } from "@/lib/file-store"
import { FileItem, MAX_CONCURRENTS, MAX_CHUNK_SIZE, FileTag, MAX_FILE_SIZE, FileType } from "@/lib/types"
import { nsfwDetector } from "@/lib/nsfw-detector"
import { Alert, AlertDescription } from "@/components/ui/alert"

// ============================================================================
// 纯函数：分片上传核心逻辑
// ============================================================================

/**
 * 计算需要上传的分片索引
 */
function getMissingChunkIndices(
  totalChunks: number,
  uploadedIndices: number[] = [],
): number[] {
  const uploadedSet = new Set(uploadedIndices)
  const result: number[] = []

  for (let i = 0; i < totalChunks; i++) {
    if (!uploadedSet.has(i)) result.push(i)
  }

  return result
}

/**
 * 更新上传进度
 */
function updateProgress(
  map: Record<string, number>,
  key: string,
  uploaded: number,
  total: number,
  setProgress: (v: Record<string, number>) => void,
) {
  map[key] = Math.round((uploaded / total) * 100)
  setProgress({ ...map })
}

/**
 * 并发分批执行任务
 */
async function runBatches(
  indices: number[],
  batchSize: number,
  task: (idx: number) => Promise<void>,
) {
  for (let i = 0; i < indices.length; i += batchSize) {
    const batch = indices.slice(i, i + batchSize)
    await Promise.all(batch.map(task))
  }
}

export function FileUploadZone() {
  const addFileLocal = useFileStore((state) => state.addFileLocal)
  const updateFileMetadata = useFileStore((state) => state.updateFileMetadata)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [resumePrompt, setResumePrompt] = useState<{ file: File; existingFile: FileItem } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const processFiles = useCallback(
    async (files: FileList, skipResumeCheck = false, resumeFile?: FileItem) => {
      if (files.length > 5) {
        toast({
          title: "最多同时上传 5 个文件",
          variant: "destructive",
        })
        return
      }
      const fileArray = Array.from(files)
      if (!fileArray.length) return

      // 支持任意大小文件，小文件走普通上传，大文件走分片上传

      // 检查是否有未完成的上传（仅对大文件）
      if (!skipResumeCheck) {
        for (const file of fileArray) {
          if (file.size > MAX_CHUNK_SIZE) {
            const incompleteFile = await checkIncompleteUpload(file)
            if (incompleteFile) {
              setResumePrompt({ file, existingFile: incompleteFile })
              return // 显示确认对话框
            }
          }
        }
      }

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

      // 分片上传 (> MAX_CHUNK_SIZE)
      const uploadChunkedFile = async (
        file: File,
        resumeFile?: FileItem
      ): Promise<{ key: string; fileType: FileType; isUnsafe: boolean } | null> => {
        if (file.size >= MAX_FILE_SIZE) {
          toast({
            title: `文件大小超过 ${formatFileSize(MAX_FILE_SIZE)}`,
            description: `Demo演示站不支持上传大文件`,
            variant: "destructive",
          })
          return null
        }

        const tmpKey = buildTmpFileKey(file)
        uploadProgressMap[tmpKey] = 0
        setUploadProgress({ ...uploadProgressMap })

        try {
          const fileType = getFileType(file.type)
          const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE)

          const key = resumeFile
            ? resumeFile.name
            : await uploadChunkInit(fileType, file.name, file.size, totalChunks)

          // ✅ 唯一可信来源：统一从 uploadedIndices 获取
          const uploadedIndices =
            resumeFile?.metadata.chunkInfo?.uploadedIndices ?? []

          // 初始进度
          updateProgress(
            uploadProgressMap,
            tmpKey,
            uploadedIndices.length,
            totalChunks,
            setUploadProgress,
          )

          const missingIndices = getMissingChunkIndices(
            totalChunks,
            uploadedIndices,
          )

          // 上传单个分片并更新进度
          const uploadSingleChunk = async (idx: number) => {
            const start = idx * MAX_CHUNK_SIZE
            const end = Math.min(start + MAX_CHUNK_SIZE, file.size)

            await uploadChunk(key, idx, file.slice(start, end))

            uploadedIndices.push(idx)
            updateProgress(
              uploadProgressMap,
              tmpKey,
              uploadedIndices.length,
              totalChunks,
              setUploadProgress,
            )
          }

          // 并发分批上传
          await runBatches(
            missingIndices,
            MAX_CONCURRENTS,
            uploadSingleChunk,
          )

          return { key, fileType, isUnsafe: false }
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
          const uploadResult = file.size > MAX_CHUNK_SIZE
            ? await uploadChunkedFile(file, resumeFile)
            : await uploadNormalFile(file)

          if (!uploadResult) return

          // 断点续传：更新已存在的文件 metadata
          if (resumeFile) {
            updateFileMetadata(resumeFile.name, {
              ...resumeFile.metadata,
              uploadedAt: Date.now(),
            })
          } else {
            // 新上传：添加到文件存储
            const fileItem: FileItem = {
              name: uploadResult.key,
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                uploadedAt: Date.now(),
                liked: false,
                tags: uploadResult.isUnsafe ? [FileTag.NSFW] : [],
              },
            }
            addFileLocal(fileItem, uploadResult.fileType)
          }
          successCount++
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error)
          failed.push((error as Error).message)
        }
      }

      // 分批上传
      for (let i = 0; i < fileArray.length; i += MAX_CONCURRENTS) {
        const batch = fileArray.slice(i, i + MAX_CONCURRENTS)
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

      {/* 断点续传确认对话框 */}
      {resumePrompt && (
        <Alert className="mt-4 bg-amber-500/10 border-amber-500/30 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <div className="flex-1 space-y-2">
            <div className="font-medium text-amber-300">
              检测到未完成的上传
            </div>
            <AlertDescription className="text-white/70">
              文件 "{resumePrompt.file.name}" 已上传{" "}
              {resumePrompt.existingFile.metadata.chunkInfo!.uploadedIndices.length} /{" "}
              {resumePrompt.existingFile.metadata.chunkInfo!.total} 个分片
            </AlertDescription>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const fileList = Object.assign([resumePrompt.file], {
                    item: (index: number) => [resumePrompt.file][index],
                    length: 1,
                  }) as FileList
                  processFiles(fileList, true, resumePrompt.existingFile)
                  setResumePrompt(null)
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded transition-colors"
              >
                继续上传
              </button>
              <button
                onClick={() => {
                  setResumePrompt(null)
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </Alert>
      )}

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
