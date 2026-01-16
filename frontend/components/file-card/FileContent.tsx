import {
  Music,
  Video,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { shouldBlur, shouldLoadImage } from "@/lib/file-preview";
import { FileImagePreview } from "@/components/file-image-preview";
import { getFileUrl } from "@/lib/api";
import { FileTag, ImageLoadMode, FileType } from "@/lib/types";

export const SMART_NO_IMAGE_THRESHOLD = 5 * 1024 * 1024;
export const ICON_DISPLAY_SIZE = "h-18 w-18";

interface FileContentProps {
  fileType: FileType;
  fileKey: string;
  safeMode: boolean;
  canPreview: boolean;
  tags?: FileTag[] | string[];
  fileSize?: number;
  loadImageMode: ImageLoadMode;
  thumbUrl?: string;
  className?: string;
  imgSrc?: string;
}

export function FileContent({
  fileType,
  fileKey,
  safeMode,
  canPreview,
  tags,
  fileSize,
  loadImageMode,
  thumbUrl,
  className,
  imgSrc,
}: FileContentProps) {
  const blur = shouldBlur({ safeMode, tags });
  const load = shouldLoadImage({
    fileType,
    loadImageMode,
    fileSize,
    threshold: SMART_NO_IMAGE_THRESHOLD,
  });

  if (fileType === FileType.Image) {
    return (
      <FileImagePreview
        src={imgSrc || getFileUrl(fileKey)}
        alt={fileKey}
        shouldLoad={load}
        shouldBlur={blur}
        canPreview={canPreview}
        iconSizeClass={ICON_DISPLAY_SIZE}
      />
    );
  }

  if (fileType === FileType.Video) {
    // 如果有缩略图，显示缩略图
    if (thumbUrl) {
      return (
        <img
          src={thumbUrl}
          alt={fileKey}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      );
    }
    return <Video className={`text-purple-300 ${className}`} />;
  }

  if (fileType === FileType.Audio) {
    return <Music className={`text-emerald-300 ${className}`} />;
  }

  return <FileText className={`text-amber-300 ${className}`} />;
}
