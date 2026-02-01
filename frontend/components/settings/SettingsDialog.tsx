"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WallpaperTab } from "./wallpaper-tab/WallpaperTab";
import { GeneralTab } from "./general-tab/GeneralTab";
import { LayoutGrid, Image as ImageIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getFromStorage, setToStorage, STORAGE_KEYS } from "@/lib/local-storage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const menuItems = [
    { id: "general", label: "常规设置", icon: Settings, color: "text-slate-500" },
    { id: "wallpaper", label: "随机壁纸", icon: ImageIcon, color: "text-sky-500" },
  ];

  // 默认使用第一个 tab 的 id
  const [activeTab, setActiveTab] = useState(() => 
    getFromStorage(STORAGE_KEYS.SETTINGS_ACTIVE_TAB, menuItems[0].id)
  );

  // 当 tab 改变时持久化到 localStorage
  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setToStorage(STORAGE_KEYS.SETTINGS_ACTIVE_TAB, id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[95vw] md:max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-border shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-primary/10 shadow-inner">
              <Settings className="h-4 w-4 text-primary animate-spin-slow" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">系统设置</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* 左侧侧边栏 / 顶部菜单 (移动端) */}
          <aside className="w-full md:w-20 lg:w-52 border-b md:border-b-0 md:border-r border-border/40 bg-muted/5 flex flex-row md:flex-col p-2 px-4 md:p-2 lg:p-4 gap-2 overflow-x-auto md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
            <TooltipProvider delayDuration={0}>
              {menuItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        "flex items-center rounded-xl text-xs md:text-sm font-semibold transition-all group relative overflow-hidden shrink-0",
                        "gap-2 md:gap-0 lg:gap-3",
                        "px-3 md:px-0 lg:px-4",
                        "py-2 md:py-4 lg:py-3",
                        "justify-center lg:justify-start w-auto md:w-full",
                        activeTab === item.id 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", activeTab === item.id ? "text-primary-foreground" : item.color)} />
                      <span className="whitespace-nowrap md:hidden lg:inline">{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="md:block lg:hidden">
                    {item.label} 
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </aside>

          {/* 右侧内容区 */}
          <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col bg-background/50">
            <div className="flex-1 min-h-0">
              {activeTab === "wallpaper" && <WallpaperTab />}
              {activeTab === "general" && <GeneralTab />}
              {activeTab !== "wallpaper" && activeTab !== "general" && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20">
                  <div className="p-8 rounded-full bg-muted/30 border border-dashed border-border/50 mb-4">
                    <LayoutGrid className="h-16 w-16" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest">功能开发中</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
