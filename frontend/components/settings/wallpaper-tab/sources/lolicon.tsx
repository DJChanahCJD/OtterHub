import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WallpaperProvider, LoliconConfig, WP_API_KEY_PLACEHOLDER } from "../types";

export const LoliconSource: WallpaperProvider<LoliconConfig> = {
  id: "lolicon",
  name: "Lolicon",
  requiresApiKey: false,
  defaultConfig: {
    r18: 0,
    tag: "",
    excludeAI: false,
  },
  getApiKey: () => WP_API_KEY_PLACEHOLDER,
  setApiKey: (config) => config,
  isNsfw: (config) => config.r18 !== 0,

  ConfigPanel: ({ config, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">标签 (Tag)</Label>
        <Input
          placeholder="例如: 萝莉, 少女..."
          value={config.tag}
          onChange={(e) => onChange({ ...config, tag: e.target.value })}
          className="h-8 text-xs bg-background/50"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">内容分级</Label>
        <Select
          value={config.r18.toString()}
          onValueChange={(v) => onChange({ ...config, r18: parseInt(v) })}
        >
          <SelectTrigger className="h-8 text-xs bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0" className="text-xs">非 R18 (SFW)</SelectItem>
            <SelectItem value="1" className="text-xs">R18</SelectItem>
            <SelectItem value="2" className="text-xs">混合</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between pt-5 px-1">
        <Label className="text-[10px] uppercase opacity-50 font-bold">排除 AI 作品</Label>
        <Switch
          checked={config.excludeAI}
          onCheckedChange={(checked) => onChange({ ...config, excludeAI: checked })}
        />
      </div>
    </div>
  ),
};
