"use client";

import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileTypeTabs } from "@/components/file-type-tabs";
import { FileTypeDropdown } from "@/components/file-type-dropdown";
import { SafeModeToggle } from "@/components/safe-mode-toggle";
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
      <header className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl">
                🦦
              </div>
              <h1 className="font-bold text-lg text-white">OtterHub</h1>
            </div>
            <div className="flex items-center gap-2">
              <FileTypeDropdown />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="text-white hover:bg-white/10"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-full bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-emerald-400"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
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
    <header className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl">
                🦦
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">OtterHub</h1>
                <p className="text-xs text-emerald-300/80">
                  All your resources, one place
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-emerald-400"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {/* 安全模式切换按钮 */}
            <SafeModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
