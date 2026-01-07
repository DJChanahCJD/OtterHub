"use client";

import { useMemo } from "react";
import { Check, Minus, Tag } from "lucide-react";
import { FileTag, FileItem } from "@/lib/types";
import { cn } from "@/lib/utils";

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

// 标签状态
type TagState = "checked" | "unchecked" | "indeterminate";

interface BatchTagEditorProps {
  files: FileItem[];
  checkedTags: Set<FileTag>;
  onTagToggle: (tag: FileTag) => void;
  disabled?: boolean;
}

export function BatchTagEditor({
  files,
  checkedTags,
  onTagToggle,
  disabled = false,
}: BatchTagEditorProps) {
  // 计算每个标签在当前文件中的状态
  const tagStates = useMemo(() => {
    const states: Record<FileTag, TagState> = {
      [FileTag.NSFW]: "unchecked",
      [FileTag.Private]: "unchecked",
    };

    const allTags = Object.values(FileTag);
    const fileCount = files.length;

    if (fileCount === 0) {
      return states;
    }

    // TODO: 有问题
    allTags.forEach((tag) => {
      // 统计有多少文件包含该标签
      const filesWithTag = files.filter(
        (file) => file.metadata?.tags?.includes(tag)
      ).length;

      if (filesWithTag === 0) {
        states[tag] = "unchecked";
      } else if (filesWithTag === fileCount) {
        states[tag] = "checked";
      } else {
        states[tag] = "indeterminate";
      }
    });

    return states;
  }, [files]);

  return (
    <div className="space-y-2">
      <label className="text-sm text-white/80">批量编辑标签</label>
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <p className="text-xs text-white/60">
          选择要应用的标签。选中标签会添加到所有文件，取消选择会从所有文件移除。
        </p>

        <div className="space-y-2">
          {Object.values(FileTag).map((tag) => {
            const config = TAG_CONFIG[tag as FileTag];
            const originalState = tagStates[tag];
            const isChecked = checkedTags.has(tag);

            return (
              <label
                key={tag}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-white/5",
                  config?.bgColor || "bg-white/5",
                  config?.borderColor || "border-white/10"
                )}
              >
                {/* 自定义复选框 */}
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => !disabled && onTagToggle(tag)}
                    disabled={disabled}
                  />
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      isChecked
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-white/30 bg-white/5"
                    )}
                  >
                    {originalState === "indeterminate" && !isChecked ? (
                      <Minus className="h-3 w-3 text-white" />
                    ) : isChecked ? (
                      <Check className="h-3.5 w-3.5 text-white" />
                    ) : null}
                  </div>
                </div>

                {/* 标签信息 */}
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag
                      className={cn(
                        "h-4 w-4",
                        config?.textColor || "text-white/60"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        config?.textColor || "text-white/80"
                      )}
                    >
                      {config?.label || tag}
                    </span>
                  </div>

                  {/* 状态指示器 */}
                  <div className="flex items-center gap-2">
                    {originalState === "indeterminate" && !isChecked && (
                      <span className="text-xs text-amber-400">
                        部分文件
                      </span>
                    )}
                    {originalState === "checked" && !isChecked && (
                      <span className="text-xs text-red-400">
                        将移除
                      </span>
                    )}
                    {originalState === "unchecked" && isChecked && (
                      <span className="text-xs text-emerald-400">
                        将添加
                      </span>
                    )}
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
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
