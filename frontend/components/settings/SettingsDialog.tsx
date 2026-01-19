"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WallpaperTab } from "./wallpaper-tab/WallpaperTab";
import { LayoutGrid, Image as ImageIcon, Settings, Shield, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("wallpaper");

  const menuItems = [
    { id: "wallpaper", label: "随机壁纸", icon: ImageIcon, color: "text-sky-500" },
    { id: "account", label: "账号安全", icon: Shield, color: "text-emerald-500", disabled: true },
    { id: "storage", label: "存储配置", icon: HardDrive, color: "text-amber-500", disabled: true },
    { id: "general", label: "常规设置", icon: Settings, color: "text-slate-500", disabled: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings className="h-5 w-5 text-primary animate-spin-slow" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">系统设置</DialogTitle>
              <DialogDescription className="text-xs opacity-60">管理您的偏好设置与外部服务集成</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* 左侧侧边栏 */}
          <aside className="w-48 border-r border-border bg-muted/10 flex flex-col p-3 gap-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.disabled && "opacity-40 cursor-not-allowed grayscale"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-primary-foreground" : item.color)} />
                {item.label}
                {item.disabled && (
                  <span className="absolute right-2 text-[8px] font-bold opacity-40 uppercase tracking-tighter">Soon</span>
                )}
              </button>
            ))}
          </aside>

          {/* 右侧内容区 */}
          <main className="flex-1 p-6 overflow-hidden flex flex-col">
            {activeTab === "wallpaper" && <WallpaperTab />}
            {activeTab !== "wallpaper" && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40">
                <LayoutGrid className="h-12 w-12 mb-2" />
                <p className="text-sm font-medium">功能开发中...</p>
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
