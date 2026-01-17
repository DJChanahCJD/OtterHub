"use client";

import { LogOut, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/api";
import { useRouter } from "next/navigation";

/**
 * 悬浮操作按钮组件 (FAB)
 * 提供登出、项目链接及管理入口等快捷操作
 */
export function FloatingActionButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Force redirect anyway
      router.push("/login");
    }
  };

  return (
    //  TODO: 不用Dropdown而是自定义几个围绕按钮
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="rounded-full h-12 w-12 shadow-2xl bg-primary/80 hover:bg-primary/90 text-primary-foreground transition-all hover:scale-110 active:scale-95 border-none"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="w-48 mb-3 border-glass-border bg-popover/95 backdrop-blur-md"
        >
          <DropdownMenuItem disabled className="focus:bg-primary/10">
            <Settings className="mr-2 h-4 w-4 text-primary" />
            <span>系统设置 (开发中)</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-glass-border" />
          
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
