import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WallpaperProvider, UnsplashConfig } from "../types";

export const UnsplashSource: WallpaperProvider<UnsplashConfig> = {
  id: "unsplash",
  name: "Unsplash",
  defaultConfig: {
    accessKey: "",
    query: "",
    orientation: "landscape",
    content_filter: "low",
  },
  getApiKey: (config) => config.accessKey,
  setApiKey: (config, accessKey) => ({ ...config, accessKey }),
  isNsfw: () => false, // Unsplash 内容通常是安全的

  ConfigPanel: ({ config, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">搜索关键词</Label>
        <Input
          placeholder="例如: Nature, Architecture..."
          value={config.query}
          onChange={(e) => onChange({ ...config, query: e.target.value })}
          className="h-8 text-xs bg-background/50"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">画幅方向</Label>
        <Select
          value={config.orientation}
          onValueChange={(v: any) => onChange({ ...config, orientation: v })}
        >
          <SelectTrigger className="h-8 text-xs bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="landscape" className="text-xs">横屏 (Landscape)</SelectItem>
            <SelectItem value="portrait" className="text-xs">竖屏 (Portrait)</SelectItem>
            <SelectItem value="squarish" className="text-xs">正方形 (Squarish)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">内容过滤</Label>
        <Select
          value={config.content_filter}
          onValueChange={(v: any) => onChange({ ...config, content_filter: v })}
        >
          <SelectTrigger className="h-8 text-xs bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low" className="text-xs">常规 (Low)</SelectItem>
            <SelectItem value="high" className="text-xs">严格 (High)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
