"use client"

import { Shield, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFileUIStore } from "@/lib/file-store"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

export function SafeModeToggle() {
  const { safeMode, setSafeMode } = useFileUIStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-foreground/60"
      >
        <Shield className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSafeMode(!safeMode)}
            className={cn(
              "h-9 w-9",
              safeMode
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "text-foreground/60 hover:text-foreground hover:bg-secondary/50",
            )}
          >
            {safeMode ? (
              <Shield className="h-4 w-4" />
            ) : (
              <ShieldOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{safeMode ? "安全模式开启 · NSFW内容遮罩" : "安全模式关闭 · 显示全部内容"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
