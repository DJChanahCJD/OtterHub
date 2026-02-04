"use client";

import { LogOut, Settings, Menu, X, Trash2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logout } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TrashSheet } from "./trash/TrashSheet";
import { SettingsDialog } from "./settings/SettingsDialog";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFileUIStore } from "@/stores/file";

/**
 * 悬浮操作按钮组件 (FAB)
 * 采用弧形展开动画，提供快捷操作入口，支持拖拽位置持久化
 */
export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Use store for persistence
  const { fabPosition, setFabPosition } = useFileUIStore();
  const [position, setPosition] = useState(fabPosition); 
  const [isDragging, setIsDragging] = useState(false);
  
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  // 初始化位置 - sync local state with store when store changes (e.g. hydration)
  useEffect(() => {
    setPosition(fabPosition);
  }, [fabPosition]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 拖拽处理逻辑
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isOpen) return;
    dragRef.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    // 捕获指针，确保离开按钮也能继续触发 move 事件
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isOpen || e.buttons === 0) return;
    
    const { startX, startY } = dragRef.current;
    const deltaX = startX - e.clientX;
    const deltaY = startY - e.clientY;

    // 移动超过 5px 才判定为拖拽，防止误触
    if (!dragRef.current.isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      dragRef.current.isDragging = true;
      setIsDragging(true);
    }

    if (dragRef.current.isDragging) {
      setPosition(prev => {
        const newPos = {
          x: Math.max(16, Math.min(window.innerWidth - 72, prev.x + deltaX)),
          y: Math.max(16, Math.min(window.innerHeight - 72, prev.y + deltaY))
        };
        return newPos;
      });
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      setFabPosition(position); // Save to store
      // 延迟重置拖拽状态，确保点击事件能正确判断
      setTimeout(() => {
        setIsDragging(false);
        dragRef.current.isDragging = false;
      }, 50);
    }
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("登出成功");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/login");
    }
  };

  const actions = [
    {
      id: "logout",
      icon: <LogOut className="h-5 w-5" />,
      label: "安全退出",
      onClick: handleLogout,
      className: "bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-destructive/20",
    },
    {
      id: "settings",
      icon: <Settings className="h-5 w-5" />,
      label: "系统设置",
      onClick: () => setIsSettingsOpen(true),
      className: "bg-sky-400/90 text-white hover:bg-sky-500 shadow-sky-400/20",
    },
    {
      id: "music",
      icon: <Music className="h-5 w-5" />,
      label: "音乐播放器",
      onClick: () => window.open('/music', '_blank'),
      className: "bg-pink-400/90 text-white hover:bg-pink-500 shadow-pink-400/20",
    },
    {
      id: "trash",
      icon: <Trash2 className="h-5 w-5" />,
      label: "回收站",
      onClick: () => setIsTrashOpen(true),
      className: "bg-indigo-400/90 text-white hover:bg-indigo-500 shadow-indigo-400/20",
    },
  ];

  return (
    <>
      <div 
        className="fixed z-50 select-none" 
        ref={containerRef}
        style={{
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          touchAction: "none",
        }}
      >
        {/* 遮罩层：开启时点击背景关闭 */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[-1] animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* 子按钮组 */}
        <div className="relative">
          {actions.map((action, index) => {
            // 计算弧形位置 (180度到270度，即从左侧到上方)
            const radius = 100;
            const totalActions = actions.length;
            const angle = 180 + (index * (90 / (totalActions - 1)));
            const radian = (angle * Math.PI) / 180;
            
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;

            return (
              <div
                key={action.id}
                className={cn(
                  "absolute transition-all duration-500 ease-out-back",
                  isOpen 
                    ? "opacity-100 scale-100 pointer-events-auto" 
                    : "opacity-0 scale-0 pointer-events-none"
                )}
                style={{
                  transform: isOpen 
                    ? `translate(${x}px, ${y}px)` 
                    : "translate(0, 0)",
                  transitionDelay: `${index * 30}ms`
                }}
              >
                <div className="group relative">
                  {/* 标签提示 */}
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-foreground/90 text-background text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg backdrop-blur-md">
                    {action.label}
                  </span>
                  
                  <Button
                    size="icon"
                    onClick={(e) => {
                      if (action.onClick) action.onClick();
                      setIsOpen(false);
                    }}
                    className={cn(
                      "h-11 w-11 rounded-xl shadow-md transition-all hover:scale-110 active:scale-95 border-none",
                      action.className
                    )}
                  >
                    {action.icon}
                  </Button>
                </div>
              </div>
            );
          })}

          {/* 主按钮 */}
          <Button
            size="icon"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
              if (!isDragging) setIsOpen(!isOpen);
            }}
            className={cn(
              "h-13 w-13 rounded-2xl shadow-xl transition-all duration-500 border-none z-10 cursor-move",
              isOpen 
                ? "bg-primary/90 text-background rotate-45 scale-90 shadow-foreground/10" 
                : "bg-primary/70 text-primary-foreground hover:scale-105 shadow-primary/30",
              isDragging && "scale-110 shadow-2xl ring-4 ring-primary/20"
            )}
          >
            {isOpen ? (
              <X className="h-6 w-6 animate-in zoom-in duration-300" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      <TrashSheet open={isTrashOpen} onOpenChange={setIsTrashOpen} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
