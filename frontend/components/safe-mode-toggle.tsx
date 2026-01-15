"use client"

import { Shield, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFileStore } from "@/lib/file-store"
import { cn } from "@/lib/utils"

export function SafeModeToggle() {
  const safeMode = useFileStore((state) => state.safeMode)
  const setSafeMode = useFileStore((state) => state.setSafeMode)

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
          <p>{safeMode ? "安全模式已开启 - NSFW内容已遮罩" : "安全模式已关闭 - 显示所有内容"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
