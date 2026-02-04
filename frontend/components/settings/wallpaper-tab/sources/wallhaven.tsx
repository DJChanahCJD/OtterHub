import { Button } from "@/components/ui/button";
import { WallpaperProvider, WallhavenConfig } from "../types";
import { cn } from "@/lib/utils";
import { WallpaperSourceId } from "@shared/types";
import { ConfigInput, ConfigItem, ConfigSelect } from "./components";

/**
 * 通用位掩码切换工具
 */
function toggleBitMask(value: string, index: number, fallback: string) {
  const arr = (value || fallback).split("");
  arr[index] = arr[index] === "1" ? "0" : "1";
  return arr.join("");
}

export const WallhavenSource: WallpaperProvider<WallhavenConfig> = {
  id: WallpaperSourceId.Wallhaven,
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
      <ConfigItem label="关键词">
        <ConfigInput
          placeholder="搜索关键词..."
          value={config.q}
          onChangeValue={(v) => onChange({ ...config, q: v })}
        />
      </ConfigItem>

      <ConfigItem label="内容分类">
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
      </ConfigItem>

      <ConfigItem label="分级筛选">
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
      </ConfigItem>

      <ConfigItem label="排序方式">
        <ConfigSelect
          value={config.sorting || "random"}
          onValueChange={(v: any) => onChange({ ...config, sorting: v })}
          options={[
            { value: "random", label: "随机" },
            { value: "relevance", label: "相关" },
            { value: "date_added", label: "最新" },
            { value: "views", label: "点击量" },
            { value: "favorites", label: "收藏" },
            { value: "toplist", label: "排行" },
          ]}
        />
      </ConfigItem>

      {config.sorting === 'toplist' && (
        <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
          <ConfigItem label="排行范围">
            <ConfigSelect
              value={config.topRange || "1M"}
              onValueChange={(v: any) => onChange({ ...config, topRange: v })}
              options={[
                { value: "1d", label: "1天" },
                { value: "3d", label: "3天" },
                { value: "1w", label: "1周" },
                { value: "1M", label: "1月" },
                { value: "3M", label: "3月" },
                { value: "6M", label: "6月" },
                { value: "1y", label: "1年" },
              ]}
            />
          </ConfigItem>
        </div>
      )}
    </div>
  )
};
