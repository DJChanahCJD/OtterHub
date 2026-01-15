"use client"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { uploadChunk, uploadChunkInit, uploadFile } from "@/lib/api"
import { buildTmpFileKey, formatFileSize, getFileType } from "@/lib/utils"
import { useFileStore } from "@/lib/file-store"
import {
  FileItem,
  FileTag,
  FileType,
  MAX_CHUNK_SIZE,
  MAX_CONCURRENTS,
  MAX_FILE_SIZE,
} from "@/lib/types"
import { nsfwDetector } from "@/lib/nsfw-detector"
import {
  updateProgress,
  getMissingChunkIndices,
  runBatches,
} from "./upload-utils"

export function FileUploadZone() {
  const addFileLocal = useFileStore((s) => s.addFileLocal)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const processFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files)
    if (!fileArray.length) return

    const uploadProgressMap: Record<string, number> = {}
    setUploadProgress({})

    let successCount = 0
    const failed: string[] = []

    /** 普通上传 */
    const uploadNormalFile = async (file: File) => {
      const tmpKey = buildTmpFileKey(file)
      uploadProgressMap[tmpKey] = 0
      setUploadProgress({ ...uploadProgressMap })

      try {
        const isUnsafe = await nsfwDetector.isUnsafeImg(file)
        const key = await uploadFile(file, isUnsafe)

        uploadProgressMap[tmpKey] = 100
        setUploadProgress({ ...uploadProgressMap })

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

        addFileLocal(fileItem, getFileType(file.type))
        successCount++
      } catch (err) {
        failed.push(`${file.name}: ${(err as Error).message}`)
      } finally {
        setTimeout(() => {
          delete uploadProgressMap[tmpKey]
          setUploadProgress({ ...uploadProgressMap })
        }, 400)
      }
    }

    /** 分片上传 */
    const uploadChunkedFile = async (file: File) => {
      if (file.size >= MAX_FILE_SIZE) {
        toast({
          title: `文件大小超过 ${formatFileSize(MAX_FILE_SIZE)}`,
          variant: "destructive",
        })
        return
      }

      const tmpKey = buildTmpFileKey(file)
      uploadProgressMap[tmpKey] = 0
      setUploadProgress({ ...uploadProgressMap })

      try {
        const fileType = getFileType(file.type)
        const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE)

        const key = await uploadChunkInit(
          fileType,
          file.name,
          file.size,
          totalChunks,
        )

        const missing = getMissingChunkIndices(totalChunks)

        const uploadOne = async (idx: number) => {
          const start = idx * MAX_CHUNK_SIZE
          const end = Math.min(start + MAX_CHUNK_SIZE, file.size)
          await uploadChunk(key, idx, file.slice(start, end))

          updateProgress(
            uploadProgressMap,
            tmpKey,
            idx + 1,
            totalChunks,
            setUploadProgress,
          )
        }

        await runBatches(missing, MAX_CONCURRENTS, uploadOne)

        const fileItem: FileItem = {
          name: key,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: Date.now(),
            liked: false,
            tags: [],
          },
        }

        addFileLocal(fileItem, fileType)
        successCount++
      } catch (err) {
        failed.push(`${file.name}: ${(err as Error).message}`)
      } finally {
        setTimeout(() => {
          delete uploadProgressMap[tmpKey]
          setUploadProgress({ ...uploadProgressMap })
        }, 400)
      }
    }

    /** 并发上传 */
    for (let i = 0; i < fileArray.length; i += MAX_CONCURRENTS) {
      const batch = fileArray.slice(i, i + MAX_CONCURRENTS)
      await Promise.all(
        batch.map((file) =>
          file.size > MAX_CHUNK_SIZE
            ? uploadChunkedFile(file)
            : uploadNormalFile(file),
        ),
      )
    }

    if (successCount > 0) {
      toast({
        title: "上传成功",
        description: `成功上传 ${successCount} 个文件`,
      })
    }

    if (failed.length) {
      toast({
        title: "部分文件失败",
        description: failed.join(", "),
        variant: "destructive",
      })
    }
  }, [addFileLocal, toast])

  return (
    <div className="mb-6">
      <div
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          processFiles(e.dataTransfer.files)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all backdrop-blur-sm bg-glass-bg
          ${isDragging
            ? "border-primary bg-primary/10"
            : "border-glass-border hover:border-primary/50"}
        `}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop files here, or click to browse
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([k, v]) => (
            <div key={k} className="bg-secondary/30 p-3 rounded-lg border border-glass-border">
              <div className="flex justify-between text-xs mb-1 text-foreground/80">
                <span>Uploading</span>
                <span>{v}%</span>
              </div>
              <Progress value={v} className="h-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}