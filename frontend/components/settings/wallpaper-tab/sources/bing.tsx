import { Label } from "@/components/ui/label";
import { WallpaperProvider, BingConfig, WP_API_KEY_PLACEHOLDER } from "../types";

export const BingSource: WallpaperProvider<BingConfig> = {
  id: "bing",
  name: "Bing 每日壁纸",
  defaultConfig: {},
  getApiKey: () => WP_API_KEY_PLACEHOLDER, // Bing 不需要 API Key
  setApiKey: (config) => config,
  isNsfw: () => false,

  ConfigPanel: () => (
    <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg bg-background/50">
      <div className="text-center">
        <Label className="text-xs opacity-50">Bing 每日壁纸最多8张，每日刷新，无需额外配置</Label>
      </div>
    </div>
  ),
};
