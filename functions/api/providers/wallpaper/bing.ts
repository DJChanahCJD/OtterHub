import { ok, fail } from "../../../utils/common";
import { UnifiedWallpaper } from "./types";

export async function onRequest(context: any) {
  try {
    const res = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8`); //  最多8张
    const data = await res.json();
    
    const wallpapers: UnifiedWallpaper[] = data.images.map((img: any) => ({
      id: img.hsh,
      previewUrl: `https://cn.bing.com${img.url}`,
      rawUrl: `https://cn.bing.com${img.urlbase}_UHD.jpg`,
      source: "bing"
    }));

    return ok(wallpapers);
  } catch (error) {
    return fail("获取壁纸失败");
  }
}