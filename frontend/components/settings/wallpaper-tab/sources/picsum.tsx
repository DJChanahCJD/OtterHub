import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { WallpaperProvider, PicsumConfig, WP_API_KEY_PLACEHOLDER } from "../types";

export const PicsumSource: WallpaperProvider<PicsumConfig> = {
  id: "picsum",
  name: "Picsum",
  requiresApiKey: false,
  defaultConfig: {
    page: 1,
    limit: 20,
    grayscale: false,
  },
  getApiKey: () => WP_API_KEY_PLACEHOLDER,
  setApiKey: (config) => config,
  isNsfw: () => false,

  ConfigPanel: ({ config, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase opacity-50 font-bold tracking-wider">
            黑白模式
          </Label>
          <Switch
            checked={config.grayscale}
            onCheckedChange={(checked) => onChange({ ...config, grayscale: checked })}
          />
        </div>
      </div>
    </div>
  ),
};
