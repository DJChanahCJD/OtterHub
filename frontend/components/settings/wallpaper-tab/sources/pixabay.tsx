import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WallpaperProvider, PixabayConfig } from "../types";

const PIXABAY_CATEGORIES = [
  { value: "backgrounds", label: "背景" },
  { value: "fashion", label: "时尚" },
  { value: "nature", label: "自然" },
  { value: "science", label: "科学" },
  { value: "education", label: "教育" },
  { value: "feelings", label: "情感" },
  { value: "health", label: "健康" },
  { value: "people", label: "人物" },
  { value: "religion", label: "宗教" },
  { value: "places", label: "地点" },
  { value: "animals", label: "动物" },
  { value: "industry", label: "工业" },
  { value: "computer", label: "计算机" },
  { value: "food", label: "美食" },
  { value: "sports", label: "运动" },
  { value: "transportation", label: "交通" },
  { value: "travel", label: "旅行" },
  { value: "buildings", label: "建筑" },
  { value: "business", label: "商务" },
  { value: "music", label: "音乐" },
];

export const PixabaySource: WallpaperProvider<PixabayConfig> = {
  id: "pixabay",
  name: "Pixabay",
  requiresApiKey: true,
  defaultConfig: {
    apiKey: "", //  key
    q: "",
    category: "",
    order: "popular",
  },
  getApiKey: (config) => config.apiKey,
  setApiKey: (config, key) => ({ ...config, apiKey: key }),
  isNsfw: () => false, // Pixabay 默认开启 SafeSearch，且 API 强制 safe

  ConfigPanel: ({ config, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <Label className="text-[10px] uppercase opacity-50 font-bold">分类</Label>
        <Select
          value={config.category || "all"}
          onValueChange={(v: any) =>
            onChange({ ...config, category: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="h-8 text-xs bg-background/50">
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {PIXABAY_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} className="text-xs">
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">排序</Label>
        <Select
          value={config.order}
          onValueChange={(v: any) => onChange({ ...config, order: v })}
        >
          <SelectTrigger className="h-8 text-xs bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular" className="text-xs">热门</SelectItem>
            <SelectItem value="latest" className="text-xs">最新</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
