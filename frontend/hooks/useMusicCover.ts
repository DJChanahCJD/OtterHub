import { useState, useEffect } from "react";
import { MusicTrack } from "@shared/types";
import { musicApi } from "@/lib/music-api";

export function useMusicCover(
  track: MusicTrack | null | undefined,
  enabled: boolean = true
) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!track?.pic_id || !enabled) {
      setCoverUrl(null);
      return;
    }

    let active = true;
    setCoverUrl(null); // Reset immediately when track changes

    const fetchCover = async () => {
      try {
        const url = await musicApi.getPic(track.pic_id!, track.source);
        if (active) {
          setCoverUrl(url);
        }
      } catch (e) {
        console.error("Failed to fetch cover:", e);
        if (active) setCoverUrl(null);
      }
    };

    fetchCover();

    return () => {
      active = false;
    };
  }, [track?.pic_id, track?.source, enabled]);

  return coverUrl;
}
