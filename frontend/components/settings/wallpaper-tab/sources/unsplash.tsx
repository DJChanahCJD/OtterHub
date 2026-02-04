import { WallpaperProvider, UnsplashConfig } from "../types";
import { WallpaperSourceId } from "@shared/types";
import { ConfigInput, ConfigItem, ConfigSelect } from "./components";

export const UnsplashSource: WallpaperProvider<UnsplashConfig> = {
  id: WallpaperSourceId.Unsplash,
  name: "Unsplash",
  requiresApiKey: true,
  defaultConfig: {
    apiKey: "", //  Access Key
    query: "",
    orientation: "landscape",
    content_filter: "low",
  },
  getApiKey: (config) => config.apiKey,
  setApiKey: (config, accessKey) => ({ ...config, apiKey: accessKey }),
  isNsfw: () => false, // Unsplash 内容通常是安全的

  ConfigPanel: ({ config, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ConfigItem label="搜索关键词">
        <ConfigInput
          placeholder="例如: Nature, Architecture..."
          value={config.query}
          onChangeValue={(v) => onChange({ ...config, query: v })}
        />
      </ConfigItem>

      <ConfigItem label="画幅方向">
        <ConfigSelect
          value={config.orientation || "landscape"}
          onValueChange={(v: any) => onChange({ ...config, orientation: v })}
          options={[
            { value: "landscape", label: "横屏 (Landscape)" },
            { value: "portrait", label: "竖屏 (Portrait)" },
            { value: "squarish", label: "正方形 (Squarish)" },
          ]}
        />
      </ConfigItem>

      <ConfigItem label="内容过滤">
        <ConfigSelect
          value={config.content_filter || "low"}
          onValueChange={(v: any) => onChange({ ...config, content_filter: v })}
          options={[
            { value: "low", label: "常规 (Low)" },
            { value: "high", label: "严格 (High)" },
          ]}
        />
      </ConfigItem>
    </div>
  ),
};
