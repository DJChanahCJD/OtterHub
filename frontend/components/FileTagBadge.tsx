"use client";

import { FileTag } from "@/lib/types";
import { TAG_CONFIG } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Tag, AlertTriangle, Lock } from "lucide-react";

interface FileTagBadgeProps {
  tag: string | FileTag;
  className?: string;
  showIcon?: boolean;
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
export function FileTagBadge({ tag, className, showIcon = false }: FileTagBadgeProps) {
  const config = TAG_CONFIG[tag as FileTag];
  const IconComponent = TAG_ICONS[tag] || Tag;
  
  if (!config) {
    // 处理未定义配置的标签
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-secondary/30 text-foreground/80 rounded border border-glass-border",
        className
      )}>
        {showIcon && <IconComponent className="h-3 w-3" />}
        {tag}
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border transition-colors",
      config.bgColor,
      config.textColor,
      config.borderColor,
      className
    )} title={config.description}>
      {showIcon && <IconComponent className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
