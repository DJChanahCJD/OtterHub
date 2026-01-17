"use client";

import { X, Plus, Tag } from "lucide-react";
import { FileTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TAG_CONFIG } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TagSelectorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TagSelector({
  tags,
  onChange,
  disabled = false,
  placeholder = "添加标签...",
}: TagSelectorProps) {
  // 获取可添加的标签（已添加的不再显示）
  const availableTags = Object.values(FileTag).filter(
    (tag) => !tags.includes(tag),
  );

  // 添加标签
  const handleAddTag = (tag: FileTag) => {
    if (!tags.includes(tag)) {
      onChange([...tags, tag]);
    }
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-9.5 p-2 rounded-lg bg-secondary/30 border border-glass-border">
        {/* 已选标签：纯展示 + 删除 */}
        {tags.map((tag) => {
          const config = TAG_CONFIG[tag as FileTag];
          return (
            <div
              key={tag}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors",
                config?.bgColor || "bg-secondary/30",
                config?.textColor || "text-foreground/80",
                config?.borderColor || "border-glass-border",
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>{config?.label || tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* 独立的 Dropdown Trigger */}
        {!disabled && availableTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-foreground/70 hover:bg-secondary/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {tags.length === 0 && placeholder}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="bg-popover border-glass-border min-w-50"
            >
              {availableTags.map((tag) => {
                const config = TAG_CONFIG[tag as FileTag];
                return (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => handleAddTag(tag as FileTag)}
                    className="text-foreground hover:bg-secondary/50 focus:bg-secondary/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Tag
                          className={cn(
                            "h-4 w-4",
                            config?.textColor || "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "text-foreground",
                            config?.textColor || "text-muted-foreground",
                          )}
                        >
                          {config?.label || tag}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          config?.bgColor || "bg-secondary/30",
                          config?.textColor || "text-muted-foreground",
                        )}
                      >
                        {config?.description || ""}
                      </span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
