import { Check, AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTagBadge } from "@/components/file-tag-badge";
import { FileDetailDialog } from "@/components/file-detail-dialog";
import { EditMetadataDialog } from "@/components/edit-metadata-dialog";
import { FileActions } from "./FileActions";
import { FileContent, ICON_DISPLAY_SIZE } from "./FileContent";
import { FileItem } from "@/lib/types";
import { cn, formatFileSize } from "@/lib/utils";
import { useFileCardActions } from "./hooks";

interface FileCardGridProps {
  file: FileItem;
  actions: ReturnType<typeof useFileCardActions>;
}

export function FileCardGrid({ file, actions }: FileCardGridProps) {
  const {
    isSelected,
    fileType,
    blur,
    isIncompleteUpload,
    showDetail,
    showEdit,
    isResuming,
    safeMode,
    imageLoadMode,
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

  return (
    <>
      <div
        className={cn(
          "group relative aspect-square rounded-xl overflow-hidden backdrop-blur-xl border transition-all cursor-pointer",
          isSelected
            ? "bg-primary/20 border-primary/50 ring-2 ring-primary/50"
            : "bg-glass-bg border-glass-border hover:border-primary/50"
        )}
      >
        {/* Checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <div
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all backdrop-blur-sm",
              isSelected
                ? "bg-primary border-primary"
                : "bg-secondary/50 border-glass-border opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
              canPreview={!blur}
              tags={file.metadata?.tags}
              fileSize={file.metadata.fileSize}
              loadImageMode={imageLoadMode}
              thumbUrl={file.metadata.thumbUrl}
              className={ICON_DISPLAY_SIZE}
            />
            {blur && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 bg-secondary/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-glass-border">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                  <span className="text-sm font-medium text-amber-500">NSFW Content</span>
                  <span className="text-xs text-muted-foreground">Safe mode is on</span>
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
            <div className="flex gap-1 shrink-0">
              {file.metadata?.tags?.map((tag) => (
                <FileTagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
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
