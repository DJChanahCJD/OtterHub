import { Video, Music, Loader2, RotateCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTagBadge } from "@/components/FileTagBadge";
import { FileDetailDialog } from "@/components/file-card/FileDetailDialog";
import { FileActions } from "./FileActions";
import { FileItem, FileType } from "@/lib/types";
import { getFileUrl } from "@/lib/api";
import { cn, formatFileSize, formatTime } from "@/lib/utils";
import { useFileCardActions } from "./hooks";
import { FileEditDialog } from "./FileEditDialog";

interface FileCardListProps {
  file: FileItem;
  actions: ReturnType<typeof useFileCardActions>;
}

export function FileCardList({ file, actions }: FileCardListProps) {
  const {
    isSelected,
    fileType,
    blur,
    isIncompleteUpload,
    showDetail,
    showEdit,
    isResuming,
    setShowDetail,
    setShowEdit,
    handleSelect,
    handleDelete,
    handleCopyLink,
    handleDownload,
    handleView,
    handleEdit,
    handleEditSuccess,
    handleToggleLike,
    handleResumeUpload,
  } = actions;

  const tags = file.metadata?.tags ?? [];
  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-md backdrop-blur-xl border transition-all cursor-pointer",
          isSelected
            ? "bg-primary/20 border-primary/50"
            : "bg-glass-bg border-glass-border hover:border-primary/30 hover:bg-secondary/30",
        )}
        onClick={handleSelect}
      >
        {/* File Icon/Preview */}
        <div className="w-9 h-9 rounded bg-secondary/30 flex items-center justify-center shrink-0 relative overflow-hidden">
          {fileType === FileType.Image ? (
            <img
              src={getFileUrl(file.name)}
              alt={file.name}
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full h-full object-cover rounded transition-all duration-300",
                blur && "blur-xs",
              )}
            />
          ) : fileType === FileType.Video ? (
            file.metadata.thumbUrl ? (
              <img
                src={file.metadata.thumbUrl}
                alt={file.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <Video className="h-6 w-6 text-purple-400" />
            )
          ) : fileType === FileType.Audio ? (
            <Music className="h-6 w-6 text-emerald-400" />
          ) : (
            <FileText className="h-6 w-6 text-amber-400" />
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {file.metadata.fileName}
          </p>
          <span className="text-xs text-foreground/40 shrink-0">
            {formatFileSize(file.metadata.fileSize || 0)}
          </span>
          <div className="flex gap-1 shrink-0">
            {tags.map((tag) => (
              <FileTagBadge key={tag} tag={tag} />
            ))}
          </div>
          </div>
        </div>

        {/* Date */}
        <div
          className="hidden md:block text-xs text-foreground/50"
          title="上传时间"
        >
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
            ({file.metadata.chunkInfo!.uploadedIndices?.length || 0}/
            {file.metadata.chunkInfo!.total})
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
      <FileEditDialog
        file={file}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
