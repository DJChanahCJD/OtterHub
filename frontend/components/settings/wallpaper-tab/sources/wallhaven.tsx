import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WallpaperProvider, WallhavenConfig } from "../types";
import { cn } from "@/lib/utils";

/**
 * 通用位掩码切换工具
 */
function toggleBitMask(value: string, index: number, fallback: string) {
  const arr = (value || fallback).split("");
  arr[index] = arr[index] === "1" ? "0" : "1";
  return arr.join("");
}

export const WallhavenSource: WallpaperProvider<WallhavenConfig> = {
  id: "wallhaven",
  name: "Wallhaven",
  requiresApiKey: true,
  defaultConfig: {
    apiKey: "",
    q: "",
    categories: "111", // General/Anime/People
    purity: "100", // SFW
    sorting: "random",
    topRange: "1M",
  },
  getApiKey: (config) => config.apiKey,
  setApiKey: (config, key) => ({ ...config, apiKey: key }),
  isNsfw: (config) => config.purity !== "100",
  
  ConfigPanel: ({ config, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">关键词</Label>
        <Input 
          placeholder="搜索关键词..." 
          value={config.q}
          onChange={(e) => onChange({ ...config, q: e.target.value })}
          className="h-8 text-xs bg-background/50"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">内容分类</Label>
        <div className="flex items-center gap-1.5 p-1 bg-background/30 border border-border/50 rounded-lg w-fit">
          {[{ label: "常规" }, { label: "动漫" }, { label: "人物" }].map(
            (cat, i) => (
            <Button
              key={cat.label}
              variant={config.categories?.[i] === '1' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-3 text-[10px] font-medium transition-all rounded-md",
                  config.categories?.[i] === "1"
                    ? "shadow-sm"
                    : "hover:bg-background/50",
              )}
                onClick={() =>
                  onChange({
                    ...config,
                    categories: toggleBitMask(config.categories!, i, "111"),
                  })
                }
            >
              {cat.label}
            </Button>
            ),
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">
          分级筛选
        </Label>
        <div className="flex items-center gap-1.5 p-1 bg-background/30 border border-border/50 rounded-lg w-fit">
          {[{ label: "安全" }, { label: "暗示" }, { label: "限制" }].map(
            (p, i) => (
            <Button
              key={p.label}
                variant={config.purity?.[i] === "1" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-3 text-[10px] font-medium transition-all rounded-md",
                  config.purity?.[i] === "1"
                    ? "shadow-sm"
                    : "hover:bg-background/50",
              )}
                onClick={() =>
                  onChange({
                    ...config,
                    purity: toggleBitMask(config.purity!, i, "100"),
                  })
                }
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">排序方式</Label>
        <Select 
          value={config.sorting} 
          onValueChange={(v: any) => onChange({ ...config, sorting: v })}
        >
          <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="random" className="text-xs">随机</SelectItem>
            <SelectItem value="relevance" className="text-xs">相关</SelectItem>
            <SelectItem value="date_added" className="text-xs">最新</SelectItem>
            <SelectItem value="views" className="text-xs">点击量</SelectItem>
            <SelectItem value="favorites" className="text-xs">收藏</SelectItem>
            <SelectItem value="toplist" className="text-xs">排行</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.sorting === 'toplist' && (
        <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
          <Label className="text-[10px] uppercase opacity-50 font-bold">排行范围</Label>
          <Select 
            value={config.topRange} 
            onValueChange={(v: any) => onChange({ ...config, topRange: v })}
          >
            <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1d" className="text-xs">1天</SelectItem>
              <SelectItem value="3d" className="text-xs">3天</SelectItem>
              <SelectItem value="1w" className="text-xs">1周</SelectItem>
              <SelectItem value="1M" className="text-xs">1月</SelectItem>
              <SelectItem value="3M" className="text-xs">3月</SelectItem>
              <SelectItem value="6M" className="text-xs">6月</SelectItem>
              <SelectItem value="1y" className="text-xs">1年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
};
