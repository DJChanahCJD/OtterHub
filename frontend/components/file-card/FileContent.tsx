import {
  Music,
  Video,
  FileText,
} from "lucide-react";
import { shouldBlur, shouldLoadImage } from "@/lib/utils";
import { getFileUrl } from "@/lib/api";
import { FileTag, FileType } from "@shared/types";
import { FileImagePreview } from "../FileImagePreview";
import { useFileUIStore } from "@/lib/file-store";
import { ImageLoadMode } from "@/lib/types";

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
  const dataSaverThreshold = useFileUIStore((s) => s.dataSaverThreshold);
  const blur = shouldBlur({ safeMode, tags });
  const load = shouldLoadImage({
    fileType,
    loadImageMode,
    fileSize,
    threshold: dataSaverThreshold * 1024 * 1024,
  });

  if (fileType === FileType.Image) {
    return (
      <FileImagePreview
        src={imgSrc || getFileUrl(fileKey)}
        alt={fileKey}
        shouldLoad={load}
        shouldBlur={blur}
        canPreview={canPreview}
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
