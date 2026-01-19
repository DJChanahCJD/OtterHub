import { Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { WallpaperProvider, PixabayConfig } from "../types";

const PIXABAY_CATEGORIES = [
  "backgrounds", "fashion", "nature", "science", "education", "feelings", "health", 
  "people", "religion", "places", "animals", "industry", "computer", "food", 
  "sports", "transportation", "travel", "buildings", "business", "music"
];

const PIXABAY_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "ru", label: "Русский" },
];

export const PixabaySource: WallpaperProvider<PixabayConfig> = {
  id: "pixabay",
  name: "Pixabay",
  icon: ImageIcon,
  storageKey: STORAGE_KEYS.PIXABAY_CONFIG,
  defaultConfig: {
    key: "",
    q: "",
    lang: "en",
    category: "",
    order: "popular",
  },
  getApiKey: (config) => config.key,
  isNsfw: () => false, // Pixabay 默认开启 SafeSearch，且 API 强制 safe
  
  ConfigPanel: ({ config, onChange }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">API Key (必填)</Label>
        <Input 
          type="password" 
          placeholder="Pixabay API Key"
          value={config.key}
          onChange={(e) => onChange({ ...config, key: e.target.value })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">关键词</Label>
        <Input 
          placeholder="搜索..." 
          value={config.q}
          onChange={(e) => onChange({ ...config, q: e.target.value })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">语言</Label>
        <Select 
          value={config.lang} 
          onValueChange={(v: any) => onChange({ ...config, lang: v })}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PIXABAY_LANGUAGES.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">分类</Label>
        <Select 
          value={config.category || "all"} 
          onValueChange={(v: any) => onChange({ ...config, category: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-9"><SelectValue placeholder="全部" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {PIXABAY_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">排序方式</Label>
        <Select 
          value={config.order} 
          onValueChange={(v: any) => onChange({ ...config, order: v })}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">热门</SelectItem>
            <SelectItem value="latest">最新</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
};
