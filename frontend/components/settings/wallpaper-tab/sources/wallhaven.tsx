import { Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { WallpaperProvider, WallhavenConfig } from "../types";

export const WallhavenSource: WallpaperProvider<WallhavenConfig> = {
  id: "wallhaven",
  name: "Wallhaven",
  icon: ImageIcon,
  storageKey: STORAGE_KEYS.WALLHAVEN_CONFIG,
  defaultConfig: {
    apiKey: "",
    q: "",
    categories: "111", // General/Anime/People
    purity: "100", // SFW
    sorting: "random",
    topRange: "1M",
  },
  getApiKey: (config) => config.apiKey,
  isNsfw: (config) => config.purity !== '100',
  
  ConfigPanel: ({ config, onChange }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">API Key (可选)</Label>
        <Input 
          type="password" 
          placeholder="访问 NSFW 需要"
          value={config.apiKey}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
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
        <Label className="text-[10px] uppercase opacity-50">分类 (General/Anime/People)</Label>
        <div className="grid grid-cols-3 gap-1">
          {['General', 'Anime', 'People'].map((cat, i) => (
            <Button
              key={cat}
              variant={config.categories?.[i] === '1' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[10px] px-1"
              onClick={() => {
                const cats = config.categories?.split('') || ['1', '1', '1'];
                cats[i] = cats[i] === '1' ? '0' : '1';
                onChange({ ...config, categories: cats.join('') });
              }}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">分级 (SFW/Sketchy/NSFW)</Label>
        <div className="grid grid-cols-3 gap-1">
          {['SFW', 'Sketchy', 'NSFW'].map((p, i) => (
            <Button
              key={p}
              variant={config.purity?.[i] === '1' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[10px] px-1"
              onClick={() => {
                const purities = config.purity?.split('') || ['1', '0', '0'];
                purities[i] = purities[i] === '1' ? '0' : '1';
                onChange({ ...config, purity: purities.join('') });
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase opacity-50">排序方式</Label>
        <Select 
          value={config.sorting} 
          onValueChange={(v: any) => onChange({ ...config, sorting: v })}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="random">随机</SelectItem>
            <SelectItem value="relevance">相关度</SelectItem>
            <SelectItem value="date_added">最新</SelectItem>
            <SelectItem value="views">播放量</SelectItem>
            <SelectItem value="favorites">收藏量</SelectItem>
            <SelectItem value="toplist">排行榜</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.sorting === 'toplist' && (
        <div className="space-y-2">
          <Label className="text-[10px] uppercase opacity-50">排行范围</Label>
          <Select 
            value={config.topRange} 
            onValueChange={(v: any) => onChange({ ...config, topRange: v })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1天</SelectItem>
              <SelectItem value="1w">1周</SelectItem>
              <SelectItem value="1M">1个月</SelectItem>
              <SelectItem value="1y">1年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
};
