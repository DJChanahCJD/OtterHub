"use client";

import { Check, Minus, Tag } from "lucide-react";
import { FileTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BatchTagState, TagStateMap, getTagIntent } from "@/lib/tag-utils";

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

interface BatchTagEditorProps {
  currentStates: TagStateMap;
  originalStates: TagStateMap;
  onToggle: (tag: FileTag) => void;
  disabled?: boolean;
}

export function BatchTagEditor({
  currentStates,
  originalStates,
  onToggle,
  disabled = false,
}: BatchTagEditorProps) {
  return (
    <div className="space-y-2">
      <div className="p-4 rounded-lg bg-secondary/30 border border-glass-border space-y-3">

        <div className="space-y-2">
          {Object.values(FileTag).map((tag) => {
            const config = TAG_CONFIG[tag as FileTag];
            const current = currentStates[tag];
            const original = originalStates[tag];

            const getIcon = () => {
              if (current === BatchTagState.All) {
                return <Check className="h-3.5 w-3.5 text-white" />;
              }
              if (current === BatchTagState.Partial) {
                return <Minus className="h-3 w-3 text-white" />;
              }
              return null;
            };

            const getCheckboxStyle = () => {
              switch (current) {
                case BatchTagState.All:
                  return "bg-primary border-primary";
                case BatchTagState.Partial:
                  return "bg-amber-500 border-amber-500";
                default:
                  return "border-glass-border bg-secondary/30";
              }
            };

            const getStatusText = () => {
              const intent = getTagIntent(current, original);

              const statusText = {
                keep: <span className="text-xs text-amber-500">保持不变</span>,
                add: <span className="text-xs text-primary">将添加</span>,
                remove: <span className="text-xs text-red-500">将移除</span>,
              }[intent];

              return statusText;
            };

            return (
              <label
                key={tag}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-secondary/50",
                  config?.bgColor || "bg-secondary/30",
                  config?.borderColor || "border-glass-border",
                )}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={current === BatchTagState.All}
                    disabled={disabled}
                    onChange={() => onToggle(tag)}
                  />
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      getCheckboxStyle(),
                    )}
                  >
                    {getIcon()}
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag
                      className={cn(
                        "h-4 w-4",
                        config?.textColor || "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        config?.textColor || "text-foreground/80",
                      )}
                    >
                      {config?.label || tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusText()}
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
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
