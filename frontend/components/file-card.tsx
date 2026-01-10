"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MoreVertical,
  Download,
  Trash2,
  Check,
  Music,
  Video,
  FileText,
  Copy,
  File,
  Heart,
  Eye,
  Edit,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  AlertTriangle,
  Loader2,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileStore } from "@/lib/file-store";
import {
  cn,
  getFileTypeFromKey,
  formatFileSize,
  downloadFile,
  formatTime,
  downloadFileV2,
} from "@/lib/utils";
import { FileItem, FileType, FileTag, MAX_CHUNK_SIZE, MAX_CONCURRENTS, BrowseMode } from "@/lib/types";
import { getFileUrl, toggleLike, deleteFile, uploadChunk } from "@/lib/api";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { useToast } from "@/hooks/use-toast";
import { FileDetailDialog } from "@/components/file-detail-dialog";
import { EditMetadataDialog } from "@/components/edit-metadata-dialog";

interface FileCardProps {
  file: FileItem;
  activeType?: FileType;
  listView?: boolean;
  masonryView?: boolean;
}

// 文件操作菜单组件
function FileActions({
  onDownload,
  onDelete,
  onView,
  onEdit,
  onToggleLike,
  onCopyLink,
  onShowDetail,
  isLiked,
}: {
  onDownload: () => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
  onToggleLike: () => void;
  onCopyLink: () => void;
  onShowDetail: () => void;
  isLiked: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {/* 收藏按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="text-white/80 hover:text-white bg-black/50 hover:bg-black/75 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLike();
        }}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            isLiked
              ? "text-pink-400 fill-pink-400"
              : "text-white/80 hover:text-pink-300"
          }`}
        />
      </Button>

      {/* 下拉菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white bg-black/50 hover:bg-black/75 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[#0d2137] border-white/10"
        >
          {/* 查看 */}
          <DropdownMenuItem
            onClick={onView}
            className="text-white hover:bg-white/10"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>

          {/* 复制链接 */}
          <DropdownMenuItem
            onClick={onCopyLink}
            className="text-white hover:bg-white/10"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>

          {/* 编辑 */}
          <DropdownMenuItem
            onClick={onEdit}
            className="text-white hover:bg-white/10"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>

          {/* 下载 */}
          <DropdownMenuItem
            onClick={onDownload}
            className="text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </DropdownMenuItem>

          {/* 详情 */}
          <DropdownMenuItem
            onClick={onShowDetail}
            className="text-white hover:bg-white/10"
          >
            <Info className="h-4 w-4 mr-2" />
            Details
          </DropdownMenuItem>

          {/* 删除 */}
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// 通用工具栏按钮组件
function ToolbarButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="
        text-white/80
        hover:text-white
        hover:bg-white/10
        backdrop-blur-sm
      "
    >
      {children}
    </Button>
  );
}

export function FileContent({
  fileType,
  fileKey,
  safeMode,
  tags,
  fileSize,
  browseMode,
}: {
  fileType: FileType;
  fileKey: string;
  safeMode: boolean;
  tags?: FileTag[] | string[];
  fileSize?: number;
  browseMode: BrowseMode;
}) {
  const isNSFW = tags?.includes(FileTag.NSFW) || false;
  const shouldBlur = safeMode && isNSFW;
  const canPreview = !shouldBlur; // 只有在非安全模式或非NSFW时才能预览

  // 5MB 阈值
  const SMART_NO_IMAGE_THRESHOLD = 5 * 1024 * 1024;

  // 判断是否应该加载图片
  const shouldLoadImage = () => {
    if (fileType !== FileType.Image) return false;
    if (browseMode === BrowseMode.DataSaver) return false; // 省流模式不加载任何图片
    if (browseMode === BrowseMode.SmartNoImage && fileSize && fileSize > SMART_NO_IMAGE_THRESHOLD) {
      return false; // 智能无图模式，大于5MB不加载
    }
    return true;
  };
  
  const ICON_DISPLAY_SIZE = "h-18 w-18"

  if (fileType === FileType.Image) {
    const imgElement = (
      shouldLoadImage() ? (<img
        src={getFileUrl(fileKey)}
        className={cn(
          "w-full h-full object-cover transition-all duration-300",
          shouldBlur ? "blur-2xl scale-110" : "cursor-zoom-in"
        )}
      />) : (
        <Image className={`${ICON_DISPLAY_SIZE} text-slate-400`} />
      )
    );

    // 只有非 NSFW 或安全模式关闭时才能预览
    return canPreview ? (
      <PhotoView src={getFileUrl(fileKey)}>{imgElement}</PhotoView>
    ) : (
      imgElement
    );
  }

  if (fileType === FileType.Video) {
    return <Video className={`${ICON_DISPLAY_SIZE} text-purple-300`} />;
  }

  if (fileType === FileType.Audio) {
    return <Music className={`${ICON_DISPLAY_SIZE} text-emerald-300`} />;
  }

  return <FileText className={`${ICON_DISPLAY_SIZE} text-amber-300`} />;
}

export function FileCard({ file, listView = false }: FileCardProps) {
  const selectedKeys = useFileStore((state) => state.selectedKeys);
  const toggleSelection = useFileStore((state) => state.toggleSelection);
  const deleteFileLocal = useFileStore((state) => state.deleteFilesLocal);
  const updateFileMetadata = useFileStore((state) => state.updateFileMetadata);
  const safeMode = useFileStore((state) => state.safeMode);
  const browseMode = useFileStore((state) => state.browseMode);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const resumeInputRef = useState<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isSelected = selectedKeys.includes(file.name);

  // 检查是否为 NSFW 内容
  const isNSFW = file.metadata?.tags?.includes(FileTag.NSFW) || false;
  const shouldBlur = safeMode && isNSFW;

  // 检查是否有未完成的上传
  const isIncompleteUpload =
    file.metadata?.chunkInfo &&
    file.metadata.chunkInfo.uploadedIndices?.length !== file.metadata.chunkInfo.total;

  // 只计算一次文件类型，提高性能
  const fileType = useMemo(() => getFileTypeFromKey(file.name), [file.name]);

  const { toast } = useToast();

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(file.name);
  };

  const handleDelete = () => {
    if (!confirm(`确定删除文件 ${file.metadata.fileName} ?`)) return;
    deleteFile(file.name).then(() => {
      deleteFileLocal([file.name]);
    });
  };

  const handleCopyLink = () => {
    const url = getFileUrl(file.name);
    navigator.clipboard.writeText(url);
    toast({
      title: "文件链接复制成功~",
    });
  };
  
  const handleDownload = () => {
    const url = getFileUrl(file.name);
    downloadFileV2(url, file.metadata);
  };

  // 查看文件
  const handleView = () => {
    const url = getFileUrl(file.name);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // 编辑元数据
  const handleEdit = () => {
    setShowEdit(true);
  };

  // 编辑成功回调
  const handleEditSuccess = (updatedMetadata: any) => {
    // 更新本地状态
    updateFileMetadata(file.name, {
      ...file.metadata,
      ...updatedMetadata,
    });
  };

  // 切换收藏状态
  const handleToggleLike = () => {
    toggleLike(file.name).then(() => {
      updateFileMetadata(file.name, {
        ...file.metadata,
        liked: !file.metadata.liked,
      });
    });
  };

  // 处理继续上传
  const handleResumeUpload = () => {
    inputRef.current?.click();
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !isIncompleteUpload) return;

    // 检查文件是否匹配
    if (
      selectedFile.name !== file.metadata.fileName ||
      selectedFile.size !== file.metadata.fileSize
    ) {
      toast({
        title: "文件不匹配",
        description: "请选择相同的文件以继续上传",
        variant: "destructive",
      });
      return;
    }

    setIsResuming(true);
    const chunkInfo = file.metadata.chunkInfo!;
    const totalChunks = chunkInfo.total;
    const uploadedIndices = new Set(chunkInfo.uploadedIndices || []);

    try {
      // 计算需要上传的分片索引
      const chunkIndicesToUpload: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!uploadedIndices.has(i)) {
          chunkIndicesToUpload.push(i);
        }
      }

      // 分批并发上传缺失分片
      for (let i = 0; i < chunkIndicesToUpload.length; i += MAX_CONCURRENTS) {
        const batch: Promise<void>[] = [];
        const end = Math.min(i + MAX_CONCURRENTS, chunkIndicesToUpload.length);
        for (let j = i; j < end; j++) {
          const chunkIndex = chunkIndicesToUpload[j];
          const start = chunkIndex * MAX_CHUNK_SIZE;
          const endPos = Math.min(start + MAX_CHUNK_SIZE, selectedFile.size);
          const chunkFile = selectedFile.slice(start, endPos);

          batch.push(uploadChunk(file.name, chunkIndex, chunkFile).then(() => {}));
        }
        await Promise.all(batch);
      }

      // 更新 metadata
      await new Promise((resolve) => setTimeout(resolve, 500)); // 等待后端更新
      window.location.reload(); // 刷新页面获取最新状态

      toast({
        title: "继续上传成功",
        description: `已成功上传 ${chunkIndicesToUpload.length} 个缺失分片`,
      });
    } catch (error) {
      console.error("继续上传失败:", error);
      toast({
        title: "继续上传失败",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsResuming(false);
    }
  };

  if (listView) {
    return (
      <>
        <div
          className={cn(
            "group flex items-center gap-4 p-4 rounded-lg backdrop-blur-xl border transition-all cursor-pointer",
            isSelected
              ? "bg-emerald-500/20 border-emerald-400/50"
              : "bg-white/5 border-white/10 hover:border-emerald-400/30 hover:bg-white/10"
          )}
          // onClick={handleSelect}
        >
          {/* Checkbox */}
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-emerald-500 border-emerald-500"
                : "border-white/30 group-hover:border-emerald-400/50"
            )}
            onClick={handleSelect}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>

          {/* File Icon/Preview */}
          <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center shrink-0 relative">
            {fileType === FileType.Image ? (
              <>
                <img
                  src={getFileUrl(file.name)}
                  alt={file.name}
                  className={cn(
                    "w-full h-full object-cover rounded transition-all duration-300",
                    shouldBlur && "blur-xl"
                  )}
                />
                {shouldBlur && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                )}
              </>
            ) : fileType === FileType.Video ? (
              <Video className="h-6 w-6 text-purple-400" />
            ) : fileType === FileType.Audio ? (
              <Music className="h-6 w-6 text-emerald-400" />
            ) : (
              <File className="h-6 w-6 text-emerald-400" />
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {file.metadata.fileName}
            </p>
            <p className="text-xs text-white/40">
              {formatFileSize(file.metadata.fileSize || 0)}
            </p>
          </div>

          {/* Date */}
          <div className="hidden md:block text-xs text-white/40" title="上传时间">
            {formatTime(file.metadata.uploadedAt || 0)}
          </div>

          {/* 继续上传按钮 */}
          {isIncompleteUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleResumeUpload();
              }}
              disabled={isResuming}
              className="text-amber-300 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
            >
              {isResuming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RotateCw className="h-4 w-4 mr-1" />
              )}
              继续上传 ({file.metadata.chunkInfo!.uploadedIndices?.length || 0}/{file.metadata.chunkInfo!.total})
            </Button>
          )}

          {/* Actions */}
          <FileActions
            onDownload={handleDownload}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            onToggleLike={handleToggleLike}
            onCopyLink={handleCopyLink}
            onShowDetail={() => setShowDetail(true)}
            isLiked={file.metadata?.liked || false}
          />
        </div>
        <FileDetailDialog
          file={file}
          open={showDetail}
          onOpenChange={setShowDetail}
        />
        <EditMetadataDialog
          file={file}
          open={showEdit}
          onOpenChange={setShowEdit}
          onSuccess={handleEditSuccess}
        />
      </>
    );
  }

  return (
    <>
      <PhotoProvider
        maskOpacity={0.85}
        toolbarRender={({ rotate, onRotate, scale, onScale }) => (
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={() => onScale(scale + 0.2)}>
              <ZoomIn className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => onScale(scale - 0.2)}>
              <ZoomOut className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => onRotate(rotate + 90)}>
              <RotateCw className="h-5 w-5" />
            </ToolbarButton>
          </div>
        )}
      >
        <div
          className={cn(
            "group relative aspect-square rounded-xl overflow-hidden backdrop-blur-xl border transition-all cursor-pointer",
            isSelected
              ? "bg-emerald-500/20 border-emerald-400/50 ring-2 ring-emerald-400/50"
              : "bg-white/10 border-white/10 hover:border-emerald-400/50"
          )}
        >
          {/* Checkbox */}
          <div className="absolute top-3 left-3 z-10">
            <div
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all backdrop-blur-sm",
                isSelected
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-black/50 border-white/50 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              )}
              onClick={handleSelect}
            >
              {isSelected && <Check className="h-4 w-4 text-white" />}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="absolute top-3 right-3 z-10">
            <FileActions
              onDownload={handleDownload}
              onDelete={handleDelete}
              onView={handleView}
              onEdit={handleEdit}
              onToggleLike={handleToggleLike}
              onCopyLink={handleCopyLink}
              onShowDetail={() => setShowDetail(true)}
              isLiked={file.metadata?.liked || false}
            />
          </div>

          {/* File Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <FileContent
                fileType={fileType}
                fileKey={file.name}
                safeMode={safeMode}
                tags={file.metadata?.tags}
                fileSize={file.metadata.fileSize}
                browseMode={browseMode}
              />
              {shouldBlur && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-3 rounded-xl">
                    <AlertTriangle className="h-8 w-8 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">NSFW Content</span>
                    <span className="text-xs text-white/60">Safe mode is on</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/80 via-black/60 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-white truncate">
                {file.metadata.fileName || file.name}
              </p>
              {isNSFW && (
                <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  NSFW
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">
                {formatFileSize(file.metadata.fileSize || 0)}
              </p>
              {isIncompleteUpload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResumeUpload();
                  }}
                  disabled={isResuming}
                  className="text-amber-300 hover:bg-amber-500/10 h-6 px-2 text-xs"
                >
                  {isResuming ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RotateCw className="h-3 w-3 mr-1" />
                      {file.metadata.chunkInfo!.uploadedIndices.length}/{file.metadata.chunkInfo!.total}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </PhotoProvider>
      <FileDetailDialog
        file={file}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
      <EditMetadataDialog
        file={file}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={handleEditSuccess}
      />
      {/* 隐藏的文件输入框，用于继续上传 */}
      {isIncompleteUpload && (
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleResumeFileSelect}
        />
      )}
    </>
  );
}
