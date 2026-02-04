import { WallpaperProvider, PixabayConfig } from "../types";
import { WallpaperSourceId } from "@shared/index";
import { ConfigInput, ConfigItem, ConfigSelect } from "./components";

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
  id: WallpaperSourceId.Pixabay,
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
      <ConfigItem label="关键词">
        <ConfigInput
          placeholder="搜索关键词..."
          value={config.q}
          onChangeValue={(v) => onChange({ ...config, q: v })}
        />
      </ConfigItem>

      <ConfigItem label="分类">
        <ConfigSelect
          value={config.category || "all"}
          onValueChange={(v) =>
            onChange({ ...config, category: v === "all" ? "" : v })
          }
          options={[
            { value: "all", label: "全部" },
            ...PIXABAY_CATEGORIES,
          ]}
          placeholder="全部"
        />
      </ConfigItem>

      <ConfigItem label="排序">
        <ConfigSelect
          value={config.order || "popular"}
          onValueChange={(v: any) => onChange({ ...config, order: v })}
          options={[
            { value: "popular", label: "热门" },
            { value: "latest", label: "最新" },
          ]}
        />
      </ConfigItem>
    </div>
  ),
};
