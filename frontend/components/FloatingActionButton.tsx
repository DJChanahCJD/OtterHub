"use client";

import { LogOut, Settings, Menu, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logout } from "@/lib/api";
import { useRouter } from "next/navigation";
import { TrashSheet } from "./trash/TrashSheet";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { STORAGE_KEYS, getFromStorage, setToStorage } from "@/lib/local-storage";

/**
 * 悬浮操作按钮组件 (FAB)
 * 采用弧形展开动画，提供快捷操作入口，支持拖拽位置持久化
 */
export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [position, setPosition] = useState({ x: 32, y: 32 }); // 默认距离右下角 32px (bottom-8, right-8)
  const [isDragging, setIsDragging] = useState(false);
  
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  // 初始化位置
  useEffect(() => {
    const savedPosition = getFromStorage(STORAGE_KEYS.FAB_POSITION, { x: 32, y: 32 });
    setPosition(savedPosition);
  }, []);

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
      setToStorage(STORAGE_KEYS.FAB_POSITION, position);
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
      className: "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20",
    },
    {
      id: "settings",
      icon: <Settings className="h-5 w-5" />,
      label: "系统设置",
      onClick: () => toast.info("设置功能开发中"),
      className: "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20",
    },
    {
      id: "trash",
      icon: <Trash2 className="h-5 w-5" />,
      label: "回收站",
      onClick: () => setIsTrashOpen(true),
      className: "bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20",
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
            className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-[-1] animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* 子按钮组 */}
        <div className="relative">
          {actions.map((action, index) => {
            // 计算弧形位置 (180度到270度，即从左侧到上方)
            const radius = 90; // 半径
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
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                    {action.label}
                  </span>
                  
                  <Button
                    size="icon"
                    onClick={(e) => {
                      if (action.onClick) action.onClick();
                      setIsOpen(false);
                    }}
                    className={cn(
                      "h-12 w-12 rounded-2xl shadow-lg transition-transform hover:scale-110 active:scale-95 border-none",
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
              "h-14 w-14 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 border-none z-10 cursor-move",
              isOpen 
                ? "bg-foreground text-background rotate-90 scale-90" 
                : "bg-primary text-primary-foreground hover:scale-110",
              isDragging && "scale-105 shadow-2xl ring-2 ring-primary/20"
            )}
          >
            {isOpen ? (
              <X className="h-7 w-7 animate-in spin-in-90 duration-300" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </Button>
        </div>
      </div>
      <TrashSheet open={isTrashOpen} onOpenChange={setIsTrashOpen} />
    </>
  );
}
