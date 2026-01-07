"use client";

import { X, Plus, Tag } from "lucide-react";
import { FileTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// 标签配置
const TAG_CONFIG = {
  [FileTag.NSFW]: {
    label: "NSFW",
    description: "敏感内容",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-300",
    borderColor: "border-amber-500/30",
  },
  [FileTag.Private]: {
    label: "Private",
    description: "私有文件",
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-300",
    borderColor: "border-purple-500/30",
  },
};

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
    (tag) => !tags.includes(tag)
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
      {!disabled && availableTags.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex flex-wrap gap-2 min-h-[38px] p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
              {tags.length === 0 ? (
                <span className="text-sm text-white/40 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {placeholder}
                </span>
              ) : (
                tags.map((tag) => {
                  const config = TAG_CONFIG[tag as FileTag];
                  return (
                    <div
                      key={tag}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors",
                        config?.bgColor || "bg-white/10",
                        config?.textColor || "text-white/80",
                        config?.borderColor || "border-white/20"
                      )}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span>{config?.label || tag}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                        className="ml-0.5 hover:opacity-70 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-[#0d2137] border-white/10 min-w-[200px]"
          >
            {availableTags.map((tag) => {
              const config = TAG_CONFIG[tag as FileTag];
              return (
                <DropdownMenuItem
                  key={tag}
                  onClick={() => handleAddTag(tag as FileTag)}
                  className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Tag
                        className={cn(
                          "h-4 w-4",
                          config?.textColor || "text-white/60"
                        )}
                      />
                      <span>{config?.label || tag}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded",
                        config?.bgColor || "bg-white/10",
                        config?.textColor || "text-white/60"
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
      ) : (
        <div className="flex flex-wrap gap-2 min-h-[38px] p-2 rounded-lg bg-white/5 border border-white/10">
          {tags.length === 0 ? (
            <span className="text-sm text-white/40">{placeholder}</span>
          ) : (
            tags.map((tag) => {
              const config = TAG_CONFIG[tag as FileTag];
              return (
                <div
                  key={tag}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors",
                    config?.bgColor || "bg-white/10",
                    config?.textColor || "text-white/80",
                    config?.borderColor || "border-white/20"
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
            })
          )}
        </div>
      )}
    </div>
  );
}
