import { CF } from "../utils/types";
import { success, error } from "../utils/common";

export async function onRequest(context: any) {
  try {
    const { env } = context;
    const value = await env[CF.KV_NAME].list();
    
    /*
    {
      keys: [
        { name: 'audio_1767359508183-etm647xv8.mp3', metadata: [Object] },
        { name: 'img_1767360224212-jdtcgze38.jpg', metadata: [Object] }
      ],
      list_complete: true,
      cacheStatus: null
    }
    */
    console.log(value);

    
    return success(value.keys, "Files fetched successfully");
  } catch (error: any) {
    console.error("List files error:", error);
    return error("Failed to fetch files", 500);
  }
}