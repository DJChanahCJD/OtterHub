"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  getUploadChunkProgress,
  uploadChunkInit,
  uploadChunkWithProgress,
  uploadFileWithProgress,
} from "@/lib/api";
import { buildTmpFileKey, formatFileSize, getFileType, cn, processBatch, getMissingChunkIndices, scanFiles } from "@/lib/utils";
import { useFileDataStore } from "@/stores/file";
import { nsfwDetector } from "@/lib/nsfw-detector";
import { toast } from "sonner";
import { FileItem, FileTag, MAX_CHUNK_SIZE, MAX_FILENAME_LENGTH, MAX_FILE_SIZE } from "@shared/types";
import { useGeneralSettingsStore } from "@/stores/general-store";
import { MAX_CONCURRENTS } from "@/lib/types";

export function FileUploadZone() {
  const addFileLocal = useFileDataStore((s) => s.addFileLocal);
  const { nsfwDetection } = useGeneralSettingsStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      if (!fileArray.length) return;

      // 重命名文件名过长的文件 (保留扩展名)
      const processedFiles = fileArray.map(file => {
        if (file.name.length <= MAX_FILENAME_LENGTH) return file;
        
        const extIndex = file.name.lastIndexOf('.');
        const ext = extIndex !== -1 ? file.name.substring(extIndex) : '';
        const nameWithoutExt = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
        
        // 截断文件名，预留扩展名空间
        const truncatedName = nameWithoutExt.substring(0, MAX_FILENAME_LENGTH - ext.length);
        const newName = truncatedName + ext;
        
        // 创建新文件对象
        return new File([file], newName, { type: file.type, lastModified: file.lastModified });
      });

      const uploadProgressMap: Record<string, number> = {};
      setUploadProgress({});

      let successCount = 0;
      const failed: string[] = [];

      /** 普通上传 */
      const uploadNormalFile = async (file: File) => {
        const tmpKey = buildTmpFileKey(file);
        uploadProgressMap[tmpKey] = 0;
        setUploadProgress({ ...uploadProgressMap });

        try {
          const isUnsafe = nsfwDetection
            ? await nsfwDetector.isUnsafeImg(file)
            : false;
          const key = await uploadFileWithProgress(file, isUnsafe, (p) => {
            uploadProgressMap[tmpKey] = p.percent;
            setUploadProgress({ ...uploadProgressMap });
          });

          uploadProgressMap[tmpKey] = 100;
          setUploadProgress({ ...uploadProgressMap });

          const fileItem: FileItem = {
            name: key,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              uploadedAt: Date.now(),
              liked: false,
              tags: isUnsafe ? [FileTag.NSFW] : [],
            },
          };

          addFileLocal(fileItem, getFileType(file.type));
          successCount++;
        } catch (err) {
          failed.push(`${file.name}: ${(err as Error).message}`);
        } finally {
          setTimeout(() => {
            delete uploadProgressMap[tmpKey];
            setUploadProgress({ ...uploadProgressMap });
          }, 400);
        }
      };

      /** 分片上传 */
      const uploadChunkedFile = async (file: File) => {
        if (file.size >= MAX_FILE_SIZE) {
          toast.warning(`文件大小超过 ${formatFileSize(MAX_FILE_SIZE)}`);
          return;
        }

        const tmpKey = buildTmpFileKey(file);
        uploadProgressMap[tmpKey] = 0;
        setUploadProgress({ ...uploadProgressMap });

        let stopPolling = false;

        try {
          const fileType = getFileType(file.type);
          const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);

          const key = await uploadChunkInit(
            fileType,
            file.name,
            file.size,
            totalChunks,
          );

          const missing = getMissingChunkIndices(totalChunks);
          const uploadedBytesByChunk = new Map<number, number>();
          let uploadedBytesTotal = 0;
          let uploadDone = false;
          let processingComplete = false;
          let lastProcessingPercent = 0;

          const processingStartAt = Date.now();
          const maxProcessingMs = Math.max(5 * 60 * 1000, totalChunks * 90 * 1000);

          const pollProcessing = async () => {
            while (!processingComplete && !stopPolling) {
              if (uploadDone && Date.now() - processingStartAt > maxProcessingMs) {
                throw new Error("后端处理超时，请稍后刷新页面查看结果");
              }

              try {
                const progress = await getUploadChunkProgress(key);
                const processingPercent =
                  progress.total > 0
                    ? Math.min(
                        100,
                        Math.round((progress.uploaded / progress.total) * 100),
                      )
                    : 0;

                lastProcessingPercent = processingPercent;

                if (uploadDone) {
                  uploadProgressMap[tmpKey] = progress.complete
                    ? 100
                    : Math.min(99, processingPercent);
                  setUploadProgress({ ...uploadProgressMap });
                }

                if (progress.complete) {
                  processingComplete = true;
                  return;
                }
              } catch {
              }

              await new Promise((r) => setTimeout(r, 1200));
            }
          };

          const pollPromise = pollProcessing();

          const uploadOne = async (idx: number) => {
            const start = idx * MAX_CHUNK_SIZE;
            const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const chunkSize = end - start;

            await uploadChunkWithProgress(key, idx, chunk, (p) => {
              const loaded = Math.min(p.loaded, chunkSize);
              const prev = uploadedBytesByChunk.get(idx) || 0;
              if (loaded === prev) return;

              uploadedBytesByChunk.set(idx, loaded);
              uploadedBytesTotal += loaded - prev;

              uploadProgressMap[tmpKey] = Math.min(
                99,
                Math.round((uploadedBytesTotal / file.size) * 100),
              );
              setUploadProgress({ ...uploadProgressMap });
            });

            const prev = uploadedBytesByChunk.get(idx) || 0;
            if (prev < chunkSize) {
              uploadedBytesByChunk.set(idx, chunkSize);
              uploadedBytesTotal += chunkSize - prev;
            }

            uploadProgressMap[tmpKey] = Math.min(
              99,
              Math.round((uploadedBytesTotal / file.size) * 100),
            );
            setUploadProgress({ ...uploadProgressMap });
          };

          await processBatch(missing, uploadOne, undefined, MAX_CONCURRENTS);
          uploadDone = true;

          uploadProgressMap[tmpKey] = Math.min(99, Math.max(uploadProgressMap[tmpKey] || 0, lastProcessingPercent || 0));
          setUploadProgress({ ...uploadProgressMap });

          await pollPromise;
          stopPolling = true;

          const fileItem: FileItem = {
            name: key,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              uploadedAt: Date.now(),
              liked: false,
              tags: [],
            },
          };

          addFileLocal(fileItem, fileType);
          successCount++;
        } catch (err) {
          failed.push(`${file.name}: ${(err as Error).message}`);
        } finally {
          stopPolling = true;
          setTimeout(() => {
            delete uploadProgressMap[tmpKey];
            setUploadProgress({ ...uploadProgressMap });
          }, 400);
        }
      };

      /** 并发上传 */
      await processBatch(
        processedFiles,
        (file) =>
          file.size > MAX_CHUNK_SIZE
            ? uploadChunkedFile(file)
            : uploadNormalFile(file),
        undefined,
        MAX_CONCURRENTS,
      );

      if (successCount > 0) {
        toast.success(`成功上传 ${successCount} 个文件`);
      }

      if (failed.length) {
        toast.error(`${failed.length}个文件上传失败`, {
          description: failed.join(", "),
        });
      }
    },
    [addFileLocal, nsfwDetection],
  ); // 确保 nsfwDetection 在依赖项中

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    if (!fileArray.length) return;

    processFiles(fileArray);
  };

  return (
    <div className="mb-6">
      <div
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);

          if (e.dataTransfer.items) {
            const files = await scanFiles(e.dataTransfer.items);
            handleFiles(files);
          } else {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all backdrop-blur-sm bg-glass-bg group",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-glass-border hover:border-primary/50",
        )}
      >
        <Upload
          className={cn(
            "h-8 w-8 mx-auto mb-3 transition-colors",
            isDragging ? "text-primary" : "text-foreground/50",
          )}
        />
        <p
          className={cn(
            "text-sm transition-colors",
            isDragging ? "text-primary font-medium" : "text-foreground/50",
          )}
        >
          {isDragging
            ? "Drop files to upload"
            : "Drag & drop files here, or click to browse"}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([k, v]) => (
            <div
              key={k}
              className="bg-secondary/30 p-3 rounded-lg border border-glass-border"
            >
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
  );
}
