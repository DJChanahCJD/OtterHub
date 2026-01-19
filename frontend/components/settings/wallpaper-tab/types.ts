// === 壁纸相关类型 ===
import { LucideIcon } from "lucide-react";

// https://pixabay.com/api/
export type PixabayConfig = {
    key: string
    q?: string;
    category?: string; // nature, science, education, people, places, animals 等
    lang?: string; // cs, da, de, en, es, fr, id, it, ja, ko, zh 等  //  en, zh, 其他
    order?: 'popular' | 'latest';
    page?: number | string;         //  指定或随机（1-20页）
}

// https://wallhaven.cc/help/api
export type WallhavenConfig = {
    apiKey: string
    q?: string;
    categories?: string;                                // 100/101/111 (General/Anime/People)
    purity?: string;                                    // 100/110/111 (SFW/Sketchy/NSFW)
    sorting?: 'date_added' | 'relevance' | 'random' | 'views' | 'favorites' | 'toplist';
    topRange?: '1d' | '3d' | '1w' | '1M' | '3M' | '6M' | '1y';
    page?: number | string;  // 指定或随机项(1-20)
}

/**
 * 统一的壁纸数据格式
 */
export type UnifiedWallpaper = {
    id: string | number;
    previewUrl: string;   //  前端直接使用的预览图 URL  TODO: 创建proxy 接口单独做代理
    rawUrl: string;       //  原图 URL
    source: string;       //  'pixabay' | 'wallhaven' | ...
}

/**
 * 壁纸提供商接口
 */
export interface WallpaperProvider<T = any> {
    id: string;
    name: string;
    icon: LucideIcon;
    storageKey: string;
    defaultConfig: T;
    
    // 配置面板组件
    ConfigPanel: React.FC<{
        config: T;
        onChange: (newConfig: T) => void;
    }>;

    // 获取 API Key (用于判断是否已配置)
    getApiKey: (config: T) => string;

    // 检查是否为 NSFW 内容
    isNsfw: (config: T) => boolean;
}
