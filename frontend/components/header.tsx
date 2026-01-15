"use client";

import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <header className="relative border-b border-glass-border backdrop-blur-xl bg-glass-bg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-xl">
                🦦
              </div>
              <h1 className="font-bold text-lg text-foreground">OtterHub</h1>
            </div>
            <div className="flex items-center gap-2">
              <FileTypeDropdown />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="text-foreground hover:bg-secondary/50"
              >
                {showMobileSearch ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {showMobileSearch && (
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-full bg-secondary/30 border-glass-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
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
