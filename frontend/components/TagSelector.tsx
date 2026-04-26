"use client";

import { X, Plus, Tag } from "lucide-react";
import { FileTag } from "@shared/types";
import { cn } from "@/lib/utils";
import { TAG_CONFIG } from "@/lib/utils";
import { FileTagBadge } from "@/components/FileTagBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TagSelectorProps {
  tags: FileTag[];
  onChange: (tags: FileTag[]) => void;
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
  const handleRemoveTag = (tagToRemove: FileTag) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-9.5 p-2 rounded-lg bg-secondary/30 border border-glass-border">
        {/* 已选标签：纯展示 + 删除 */}
        {tags.map((tag) => (
          <FileTagBadge
            key={tag}
            tag={tag}
            removable={!disabled}
            onRemove={() => handleRemoveTag(tag)}
          />
        ))}

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
                const config = TAG_CONFIG[tag];
                return (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="text-foreground hover:bg-secondary/50 focus:bg-secondary/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Tag
                          className={cn(
                            "h-4 w-4",
                            config?.textColor || "text-foreground/60",
                          )}
                        />
                        <span
                          className={cn(
                            "text-foreground",
                            config?.textColor || "text-foreground/60",
                          )}
                        >
                          {config?.label || tag}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          config?.bgColor || "bg-secondary/30",
                          config?.textColor || "text-foreground/60",
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
