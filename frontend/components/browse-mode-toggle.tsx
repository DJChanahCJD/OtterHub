"use client";

import { Image, ImageOff, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileStore } from "@/lib/file-store";
import { BrowseMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES = {
  [BrowseMode.Default]: { label: "默认", icon: Image, desc: "全量加载" },
  [BrowseMode.SmartNoImage]: { label: "省流", icon: ZapOff, desc: ">5MB跳过" },
  [BrowseMode.NoImage]: { label: "无图", icon: ImageOff, desc: "禁用图片" },
};

export function BrowseModeToggle() {
  const { browseMode, setBrowseMode } = useFileStore();
  const Icon = MODES[browseMode].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 transition-colors",
            browseMode !== BrowseMode.Default
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="bg-[#0d2137] border-white/10 w-40 p-1">
        {Object.entries(MODES).map(([id, { label, icon: ModeIcon, desc }]) => (
          <DropdownMenuItem
            key={id}
            onClick={() => setBrowseMode(id as BrowseMode)}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 cursor-pointer focus:bg-white/10 text-white/80",
              browseMode === id && "bg-emerald-500/10 text-emerald-400 focus:bg-emerald-500/20"
            )}
          >
            <div className="flex items-center gap-2">
              <ModeIcon className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-[10px] opacity-40 italic">{desc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}