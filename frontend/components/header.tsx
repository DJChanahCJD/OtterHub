"use client";

import { Search, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FileTypeTabs } from "@/components/file-type-tabs";
import { FileTypeDropdown } from "@/components/file-type-dropdown";
import { SafeModeToggle } from "@/components/safe-mode-toggle";
import { ImageLoadModeToggle } from "@/components/browse-mode-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFileStore } from "@/lib/file-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function Header() {
  const searchQuery = useFileStore((state) => state.searchQuery);
  const setSearchQuery = useFileStore((state) => state.setSearchQuery);
  const isMobile = useIsMobile();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // 移动端头部导航栏
  if (isMobile) {
    return (
      <header className="relative border-b border-glass-border backdrop-blur-xl bg-glass-bg sticky top-0 z-40 h-[57px] flex items-center">
        <div className="px-4 w-full">
          {showMobileSearch ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowMobileSearch(false);
                  setSearchQuery("");
                }}
                className="shrink-0 h-9 w-9"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="搜索文件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9 w-full bg-secondary/30 border-glass-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-lg shrink-0">
                  🦦
                </div>
                <h1 className="font-bold text-base text-foreground truncate">OtterHub</h1>
              </div>

              <div className="flex items-center gap-1">
                <FileTypeDropdown />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileSearch(true)}
                  className="h-9 w-9 text-foreground hover:bg-secondary/50"
                >
                  <Search className="h-5 w-5" />
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-foreground hover:bg-secondary/50"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl border-glass-border bg-popover pb-10 px-6">
                    <SheetHeader className="border-b border-glass-border mb-6">
                      <SheetTitle className="text-left text-foreground flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        偏好设置
                      </SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">安全模式</span>
                          <span className="text-xs text-muted-foreground">遮罩敏感内容 (NSFW)</span>
                        </div>
                        <SafeModeToggle />
                      </div>
                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">图片加载</span>
                          <span className="text-xs text-muted-foreground">根据文件大小自动省流</span>
                        </div>
                        <ImageLoadModeToggle />
                      </div>
                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">主题切换</span>
                          <span className="text-xs text-muted-foreground">切换深色或浅色模式</span>
                        </div>
                        <ThemeToggle />
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // 桌面端头部导航栏
  return (
    <header className="relative border-b border-glass-border backdrop-blur-xl bg-glass-bg">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-2xl">
                🦦
              </div>
              <div>
                <h1 className="font-bold text-xl text-foreground">OtterHub</h1>
                <p className="text-xs text-primary/80">
                  Stash your files like an otter
                </p>
              </div>
            </div>
          </div>

          {/* Center: File Type Tabs */}
          <div className="flex-1 max-w-2xl">
            <FileTypeTabs />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-64 bg-secondary/30 border-glass-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {/* 安全模式切换按钮 */}
            <SafeModeToggle />
            {/* 图片加载模式切换按钮 */}
            <ImageLoadModeToggle />
            {/* 主题切换按钮 */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
