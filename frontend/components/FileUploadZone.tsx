"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { uploadChunk, uploadChunkInit, uploadFile } from "@/lib/api";
import { buildTmpFileKey, formatFileSize, getFileType, cn, processBatch, getMissingChunkIndices, scanFiles } from "@/lib/utils";
import { createPdfFromImages } from "@/lib/pdf";
import { useFileDataStore } from "@/stores/file";
import { MAX_CHUNK_SIZE, MAX_CONCURRENTS, MAX_FILE_SIZE } from "@/lib/types";
import { nsfwDetector } from "@/lib/nsfw-detector";
import { toast } from "sonner";
import { FileItem, FileTag } from "@shared/types";
import { useGeneralSettingsStore } from "@/stores/general-store";
import { updateProgress } from "@/lib/utils/upload";

export function FileUploadZone() {
  const addFileLocal = useFileDataStore((s) => s.addFileLocal);
  const { nsfwDetection } = useGeneralSettingsStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [pdfProcessing, setPdfProcessing] = useState<{ processing: boolean; current: number; total: number }>({
    processing: false,
    current: 0,
    total: 0
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      if (!fileArray.length) return;

      // 如果处于合并模式，且输入包含图片，则执行合并
      // 注意：如果是递归调用（传入的是生成的PDF），不应再次合并
      // 这里通过简单的判断：如果只传入了一个 PDF 文件且是合并模式触发的，可能需要区分
      // 但更安全的方式是：合并逻辑在 processFiles 外部调用，或者 processFiles 内部处理
      // 鉴于 processFiles 被多处调用，我们在 handleFiles 中处理合并逻辑更清晰
      
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

          const uploadOne = async (idx: number) => {
            const start = idx * MAX_CHUNK_SIZE;
            const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
            await uploadChunk(key, idx, file.slice(start, end));

            updateProgress(
              uploadProgressMap,
              tmpKey,
              idx + 1,
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
        fileArray,
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
        
        if (images.length === 0) {
             if (fileArray.length > 0) {
                 toast.info("当前为合并模式，但未检测到图片，已转为普通上传");
                 processFiles(fileArray);
             }
             return;
        }

        if (images.length < fileArray.length) {
            toast.warning(`已忽略 ${fileArray.length - images.length} 个非图片文件`);
        }

        try {
            setPdfProcessing({ processing: true, current: 0, total: images.length });
            const pdfFile = await createPdfFromImages(images, (c, t) => {
                setPdfProcessing({ processing: true, current: c, total: t });
            });
            
            await processFiles([pdfFile]);
            toast.success("PDF 合并完成并开始上传");
        } catch (e) {
            console.error(e);
            toast.error("PDF 合并失败: " + (e as Error).message);
        } finally {
            setPdfProcessing({ processing: false, current: 0, total: 0 });
        }
    } else {
        processFiles(fileArray);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-end mb-2 space-x-2">
         <div className="flex items-center space-x-2">
            <Switch id="merge-mode" checked={isMergeMode} onCheckedChange={setIsMergeMode} />
            <Label htmlFor="merge-mode" className="text-sm text-foreground/80 cursor-pointer select-none">
              Merge images to PDF
            </Label>
         </div>
      </div>

      {pdfProcessing.processing && (
        <div className="mb-4 bg-secondary/30 p-3 rounded-lg border border-glass-border">
            <div className="flex justify-between text-xs mb-1 text-foreground/80">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Generating PDF...</span>
                </div>
                <span>{pdfProcessing.current} / {pdfProcessing.total}</span>
            </div>
            <Progress value={pdfProcessing.total > 0 ? (pdfProcessing.current / pdfProcessing.total) * 100 : 0} className="h-1" />
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
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all backdrop-blur-sm bg-glass-bg",
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
            : isMergeMode 
              ? "Drag & drop images to merge into PDF" 
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
