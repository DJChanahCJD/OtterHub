"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { uploadChunk, uploadChunkInit, uploadFile } from "@/lib/api";
import { buildTmpFileKey, formatFileSize, getFileType, cn, processBatch, getMissingChunkIndices, scanFiles } from "@/lib/utils";
import { createPdfFromImages } from "@/lib/pdf";
import { createNovelFromTexts } from "@/lib/novel";
import { useFileDataStore } from "@/stores/file";
import { MAX_CHUNK_SIZE, MAX_CONCURRENTS, MAX_FILE_SIZE } from "@/lib/types";
import { nsfwDetector } from "@/lib/nsfw-detector";
import { toast } from "sonner";
import { FileItem, FileTag, MAX_FILENAME_LENGTH } from "@shared/types";
import { useGeneralSettingsStore } from "@/stores/general-store";
import { updateProgress } from "@/lib/utils/upload";

export function FileUploadZone() {
  const addFileLocal = useFileDataStore((s) => s.addFileLocal);
  const { nsfwDetection } = useGeneralSettingsStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeProcessing, setMergeProcessing] = useState<{ processing: boolean; current: number; total: number; type: 'pdf' | 'novel' }>({
    processing: false,
    current: 0,
    total: 0,
    type: 'pdf'
  });
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
          const key = await uploadFile(file, isUnsafe);

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
          let completedChunks = totalChunks - missing.length;

          const uploadOne = async (idx: number) => {
            const start = idx * MAX_CHUNK_SIZE;
            const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
            await uploadChunk(key, idx, file.slice(start, end));

            completedChunks++;
            updateProgress(
              uploadProgressMap,
              tmpKey,
              completedChunks,
              totalChunks,
              setUploadProgress,
            );
          };

          await processBatch(missing, uploadOne, undefined, MAX_CONCURRENTS);

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

    if (isMergeMode) {
        const images = fileArray.filter(f => f.type.startsWith('image/'));
        const texts = fileArray.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md'));
        
        if (images.length === 0 && texts.length === 0) {
             if (fileArray.length > 0) {
                 toast.info("当前为合并模式，但未检测到图片或文本，已转为普通上传");
                 processFiles(fileArray);
             }
             return;
        }

        // 优先处理图片合并为 PDF
        if (images.length > 0) {
            if (images.length < fileArray.length && texts.length === 0) {
                toast.warning(`已忽略 ${fileArray.length - images.length} 个非图片文件`);
            }

            try {
                setMergeProcessing({ processing: true, current: 0, total: images.length, type: 'pdf' });
                const pdfFile = await createPdfFromImages(images, (c, t) => {
                    setMergeProcessing({ processing: true, current: c, total: t, type: 'pdf' });
                });
                
                await processFiles([pdfFile]);
                toast.success("PDF 合并完成并开始上传");
            } catch (e) {
                console.error(e);
                toast.error("PDF 合并失败: " + (e as Error).message);
            } finally {
                setMergeProcessing({ processing: false, current: 0, total: 0, type: 'pdf' });
            }
        } 
        // 其次处理文本合并为小说
        else if (texts.length > 0) {
            if (texts.length < fileArray.length) {
                toast.warning(`已忽略 ${fileArray.length - texts.length} 个非文本文件`);
            }

            try {
                setMergeProcessing({ processing: true, current: 0, total: texts.length, type: 'novel' });
                const novelFile = await createNovelFromTexts(texts, (c, t) => {
                    setMergeProcessing({ processing: true, current: c, total: t, type: 'novel' });
                });
                
                await processFiles([novelFile]);
                toast.success("小说合并完成并开始上传");
            } catch (e) {
                console.error(e);
                toast.error("小说合并失败: " + (e as Error).message);
            } finally {
                setMergeProcessing({ processing: false, current: 0, total: 0, type: 'novel' });
            }
        }
    } else {
        processFiles(fileArray);
    }
  };

  return (
    <div className="mb-6">
      {mergeProcessing.processing && (
        <div className="mb-4 bg-secondary/30 p-3 rounded-lg border border-glass-border">
            <div className="flex justify-between text-xs mb-1 text-foreground/80">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{mergeProcessing.type === 'pdf' ? 'Generating PDF...' : 'Generating Novel...'}</span>
                </div>
                <span>{mergeProcessing.current} / {mergeProcessing.total}</span>
            </div>
            <Progress value={mergeProcessing.total > 0 ? (mergeProcessing.current / mergeProcessing.total) * 100 : 0} className="h-1" />
        </div>
      )}

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
        <div 
          className="absolute top-4 right-4 flex items-center space-x-2 z-10 transition-opacity opacity-70 hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch id="merge-mode" checked={isMergeMode} onCheckedChange={setIsMergeMode} />
          <Label htmlFor="merge-mode" className="text-xs text-foreground/70 cursor-pointer select-none font-normal">
            Merge Mode
          </Label>
        </div>

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
            : isMergeMode 
              ? "Drag & drop images (to PDF) or texts (to Novel)" 
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
