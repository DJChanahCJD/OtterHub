"use client";

import { Image, ImageOff, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGeneralSettingsStore } from "@/stores/general-store";
import { ImageLoadMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const MODES = {
  [ImageLoadMode.Default]: { label: "默认", icon: Image, desc: "全量加载" },
  [ImageLoadMode.DataSaver]: { label: "省流", icon: ZapOff, desc: `跳过大图` },
  [ImageLoadMode.NoImage]: { label: "无图", icon: ImageOff, desc: "禁用图片" },
};

export function ImageLoadModeToggle() {
  const { imageLoadMode, setImageLoadMode } = useGeneralSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    const DefaultIcon = MODES[ImageLoadMode.DataSaver].icon;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-foreground/60"
      >
        <DefaultIcon className="h-4 w-4" />
      </Button>
    );
  }

  // Ensure type safety when accessing MODES
  const modeConfig = MODES[imageLoadMode as ImageLoadMode] || MODES[ImageLoadMode.Default];
  const Icon = modeConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 transition-colors",
            imageLoadMode !== ImageLoadMode.Default
              ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
              : "text-foreground/60 hover:text-foreground-muted hover:bg-secondary/50"
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="bg-popover border-glass-border w-40 p-1">
        {Object.entries(MODES).map(([id, { label, icon: ModeIcon, desc }]) => (
          <DropdownMenuItem
            key={id}
            onClick={() => setImageLoadMode(id as ImageLoadMode)}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 cursor-pointer focus:bg-secondary/50 text-foreground/80",
              imageLoadMode === id && "bg-primary/10 text-primary focus:bg-primary/20"
            )}
          >
            <div className="flex items-center gap-2">
              <ModeIcon className="h-3.5 w-3.5 text-foreground/80" />
              <span className="text-sm font-medium text-foreground/80">{label}</span>
            </div>
            <span className="text-[10px] opacity-60 italic text-foreground/60">{desc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
