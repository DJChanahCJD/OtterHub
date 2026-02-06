import { useState, useMemo, useRef } from "react";
import { useActiveSelectedKeys, useFileDataStore, useFileUIStore } from "@/stores/file";
import { getFileTypeFromKey, downloadFile, getMissingChunkIndices, processBatch } from "@/lib/utils";
import { getFileUrl, moveToTrash, toggleLike, uploadChunk } from "@/lib/api";
import { MAX_CONCURRENTS, MAX_CHUNK_SIZE } from "@/lib/types";
import { toast } from "sonner";
import { shouldBlur } from "@/lib/utils";
import { FileItem, FileType } from "@shared/types";
import { useGeneralSettingsStore } from "@/stores/general-store";

export function useFileCardActions(file: FileItem) {
  const {
    updateFileMetadata,
    moveToTrashLocal,
  } = useFileDataStore();
  
  const {
    toggleSelection,
  } = useFileUIStore();
  
  const { safeMode } = useGeneralSettingsStore();

  const selectedKeys = useActiveSelectedKeys();

  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isSelected = selectedKeys.includes(file.name);
  const fileType = useMemo(() => getFileTypeFromKey(file.name), [file.name]);
  const blur = shouldBlur({ safeMode, tags: file.metadata?.tags });
  const isIncompleteUpload =
    file.metadata?.chunkInfo &&
    file.metadata.chunkInfo.uploadedIndices?.length !== file.metadata.chunkInfo.total;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(file.name, fileType);
  };

  const handleDelete = () => {
    if (!confirm(`确定删除文件 ${file.metadata.fileName} ?`)) return;
    moveToTrash(file.name).then(() => {
      moveToTrashLocal(file);
      toast.success("已移入回收站");
    });
  };

  const handleCopyLink = () => {
    const url = getFileUrl(file.name);
    navigator.clipboard.writeText(url);
    toast.success("文件链接复制成功~");
  };
  
  const handleShare = () => {
    setShowShare(true);
  };

  const handleDownload = () => {
    const url = getFileUrl(file.name);
    downloadFile(url, file.metadata);
  };

  const handleView = () => {
    const url = getFileUrl(file.name);
    
    if (file.metadata.fileName?.toLowerCase().endsWith(".epub")) {
      const readerUrl = `/epub-reader?url=${encodeURIComponent(url)}&title=${encodeURIComponent(file.metadata.fileName || "Epub")}`;
      window.open(readerUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (fileType === FileType.Video) {
      setShowVideoPreview(true);
      return;
    }
    
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleEdit = () => {
    setShowEdit(true);
  };

  const handleEditSuccess = (updatedMetadata: any) => {
    updateFileMetadata(file.name, {
      ...file.metadata,
      ...updatedMetadata,
    });
  };

  const handleToggleLike = () => {
    toggleLike(file.name).then(() => {
      updateFileMetadata(file.name, {
        ...file.metadata,
        liked: !file.metadata.liked,
      });
    });
  };

  const handleResumeUpload = () => {
    inputRef.current?.click();
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !isIncompleteUpload) return;

    if (
      selectedFile.name !== file.metadata.fileName ||
      selectedFile.size !== file.metadata.fileSize
    ) {
      toast.error("文件不匹配");
      return;
    }

    setIsResuming(true);
    const chunkInfo = file.metadata.chunkInfo!;
    const totalChunks = chunkInfo.total;
    const uploadedIndices = new Set(chunkInfo.uploadedIndices || []);

    try {
      const chunkIndicesToUpload = getMissingChunkIndices(
        totalChunks,
        chunkInfo.uploadedIndices
      );

      await processBatch(
        chunkIndicesToUpload,
        async (chunkIndex) => {
          const start = chunkIndex * MAX_CHUNK_SIZE;
          const endPos = Math.min(start + MAX_CHUNK_SIZE, selectedFile.size);
          const chunkFile = selectedFile.slice(start, endPos);

          await uploadChunk(file.name, chunkIndex, chunkFile);
        },
        undefined,
        MAX_CONCURRENTS
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.reload();
      toast.success(`上传成功`);
    } catch (error) {
      console.error("继续上传失败:", error);
      toast.error("继续上传失败");
    } finally {
      setIsResuming(false);
    }
  };

  return {
    // States
    isSelected,
    fileType,
    blur,
    isIncompleteUpload,
    showDetail,
    showEdit,
    showShare,
    showVideoPreview,
    isResuming,

    inputRef,
    
    // Actions
    setShowDetail,
    setShowEdit,
    setShowShare,
    setShowVideoPreview,
    handleSelect,
    handleDelete,
    handleCopyLink,
    handleShare,
    handleDownload,
    handleView,
    handleEdit,
    handleEditSuccess,
    handleToggleLike,
    handleResumeUpload,
    handleResumeFileSelect,
  };
}
