import { WallpaperProvider, PicsumConfig, WP_API_KEY_PLACEHOLDER } from "../types";
import { WallpaperSourceId } from "@shared/index";
import { ConfigSwitch } from "./components";

export const PicsumSource: WallpaperProvider<PicsumConfig> = {
  id: WallpaperSourceId.Picsum,
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
        <ConfigSwitch
          label="黑白模式"
          checked={config.grayscale}
          onCheckedChange={(checked) => onChange({ ...config, grayscale: checked })}
        />
      </div>
    </div>
  ),
};
