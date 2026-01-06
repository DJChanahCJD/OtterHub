"use client";

import type React from "react";

import { useEffect, useMemo } from "react";
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
} from "@/lib/utils";
import { FileItem, FileType } from "@/lib/types";
import { getFileUrl, editFileName, toggleLike, deleteFile } from "@/lib/api";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { useToast } from "@/hooks/use-toast";

interface FileCardProps {
  file: FileItem;
  activeType?: FileType;
  listView?: boolean;
}

// 文件操作菜单组件
function FileActions({
  onDownload,
  onDelete,
  onView,
  onEdit,
  onToggleLike,
  onCopyLink,
  isLiked,
}: {
  onDownload: () => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
  onToggleLike: () => void;
  onCopyLink: () => void;
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
}: {
  fileType: FileType;
  fileKey: string;
}) {
  if (fileType === FileType.Image) {
    return (
      <PhotoView src={getFileUrl(fileKey)}>
        <img
          data-key={fileKey}
          src={getFileUrl(fileKey)}
          className="w-full h-full object-cover cursor-zoom-in"
        />
      </PhotoView>
    );
  }

  if (fileType === FileType.Video) {
    return <Video className="h-12 w-12 text-purple-300" />;
  }

  if (fileType === FileType.Audio) {
    return <Music className="h-12 w-12 text-emerald-300" />;
  }

  return <FileText className="h-12 w-12 text-amber-300" />;
}

export function FileCard({ file, listView = false }: FileCardProps) {
  const selectedKeys = useFileStore((state) => state.selectedKeys);
  const toggleSelection = useFileStore((state) => state.toggleSelection);
  const deleteFileLocal = useFileStore((state) => state.deleteFilesLocal);
  const updateFileMetadata = useFileStore((state) => state.updateFileMetadata);

  const isSelected = selectedKeys.includes(file.name);

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
    downloadFile(url, file.metadata.fileName);
  };

  // 查看文件
  const handleView = () => {
    const url = getFileUrl(file.name);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // 编辑文件名
  const handleEdit = () => {
    const newName = prompt("请输入新的文件名：", file.metadata.fileName);
    if (newName && newName.trim() && newName !== file.metadata.fileName) {
      editFileName(file.name, newName.trim()).then(() => {
        updateFileMetadata(file.name, {
          ...file.metadata,
          fileName: newName.trim(),
        });
      });
    }
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

  if (listView) {
    return (
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
        <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center shrink-0">
          {fileType === FileType.Image ? (
            <img
              src={getFileUrl(file.name)}
              alt={file.name}
              className="w-full h-full object-cover rounded"
            />
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

        {/* Actions */}
        <FileActions
          onDownload={handleDownload}
          onDelete={handleDelete}
          onView={handleView}
          onEdit={handleEdit}
          onToggleLike={handleToggleLike}
          onCopyLink={handleCopyLink}
          isLiked={file.metadata?.liked || false}
        />
      </div>
    );
  }

  return (
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
            isLiked={file.metadata?.liked || false}
          />
        </div>

        {/* File Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <FileContent fileType={fileType} fileKey={file.name} />
          </div>
        </div>

        {/* File Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/80 via-black/60 to-transparent">
          <p className="text-sm font-medium text-white truncate">
            {file.metadata.fileName || file.name}
          </p>
          <p className="text-xs text-white/60">
            {formatFileSize(file.metadata.fileSize || 0)}
          </p>
        </div>
      </div>
    </PhotoProvider>
  );
}
