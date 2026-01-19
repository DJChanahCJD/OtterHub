/**
 * 壁纸 API 配置
 */

// https://pixabay.com/api/
export type PixabayConfig = {
    key: string
    q?: string;
    category?: string; // nature, science, education, people, places, animals 等
    lang?: string; // cs, da, de, en, es, fr, id, it, ja, ko, zh 等  //  en, zh, 其他
    order?: 'popular' | 'latest';
    page?: number | string;         //  指定或随机（1-20页）
}

// https://wallhaven.cc/help/api#search
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
    source: 'pixabay' | 'wallhaven';
}
