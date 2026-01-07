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
                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                : "text-white/60 hover:text-white hover:bg-white/10",
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
