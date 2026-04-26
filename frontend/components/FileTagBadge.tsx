"use client";

import { FileTag } from "@shared/types";
import { TAG_CONFIG } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Tag, AlertTriangle, Lock, X } from "lucide-react";

interface FileTagBadgeProps {
  tag: string | FileTag;
  forceDark?: boolean;
  onRemove?: () => void;
}

// 标签特定的图标映射
const TAG_ICONS: Record<string, any> = {
  [FileTag.NSFW]: AlertTriangle,
  [FileTag.Private]: Lock,
};

/**
 * 通用的文件标签展示组件
 * 支持自动根据配置匹配样式和图标
 */
export function FileTagBadge({
  tag,
  forceDark = false,
  onRemove,
}: FileTagBadgeProps) {
  const config = TAG_CONFIG[tag as FileTag];
  const IconComponent = TAG_ICONS[tag] || Tag;

  if (!config) {
    // 处理未定义配置的标签
    const badge = (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-1 text-xs bg-secondary/30 text-foreground/80 rounded border border-glass-border",
        )}
      >
        <IconComponent className="h-3 w-3" />
        <span>{tag}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-0.5 hover:opacity-70 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );

    if (forceDark) {
      return <span className="dark">{badge}</span>;
    }
    return badge;
  }

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-1 text-xs rounded border transition-colors",
        config.bgColor,
        config.textColor,
        config.borderColor,
      )}
      title={config.description}
    >
      <IconComponent className="h-3 w-3" />
      <span>{config.label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );

  if (forceDark) {
    return <span className="dark">{badge}</span>;
  }

  return badge;
}
