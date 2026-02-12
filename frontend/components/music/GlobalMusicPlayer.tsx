"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMusicStore } from "@/stores/music-store";
import { musicApi } from "@/lib/music-api";
import { retry } from "@/lib/utils";
import { toast } from "sonner";

export function GlobalMusicPlayer() {
  const {
    queue,
    currentIndex,
    volume,
    isRepeat,
    isPlaying,
    setIsPlaying,
    setIsLoading,
    playNext,
    setAudioCurrentTime,
    currentAudioTime,
    seekTimestamp,
    quality,
    setDuration,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrack = queue[currentIndex];
  
  // Ref to track if we should auto-play after load
  const shouldPlayRef = useRef(false);
  // Ref to track current request to avoid race conditions
  const requestIdRef = useRef(0);
  // Ref to throttle time updates
  const lastSaveTimeRef = useRef(0);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((e) => {
        console.error("Play failed:", e);
        // Don't setIsPlaying(false) here immediately, as it might be loading
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Handle Seek
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTimestamp === 0) return;
    
    // Check if valid time
    if (Number.isFinite(currentAudioTime)) {
       audio.currentTime = currentAudioTime;
    }
  }, [seekTimestamp]); 
  // Dependency on seekTimestamp ensures we only seek when explicit action happens
  // We don't depend on currentAudioTime alone because that changes during playback

  // Load Track Logic
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const load = async () => {
      const audio = audioRef.current!;
      setIsLoading(true);
      
      // If we are already playing this track (e.g. mounting), don't reload unless src missing
      // But usually this effect runs when currentIndex changes.
      
      try {
        // Pause current
        audio.pause();
        
        // 1. Get URL
        const url = await retry(
          () => musicApi.getUrl(currentTrack.id, currentTrack.source, parseInt(quality)),
          2,
          600
        );

        if (cancelled || requestId !== requestIdRef.current) return;
        if (!url) throw new Error("EMPTY_URL");

        // 2. Set Source
        if (audio.src !== url) {
            audio.src = url;
            audio.load();
            
            // Restore time if needed (only on initial load of the track if savedTime > 0)
            // But usually we start from 0 unless restoring session.
            // For now, let's start from 0 or savedTime if just mounted?
            // Since we handle page navigation, component stays mounted. 
            // So if currentIndex changed, we start from 0.
            // If we just refreshed page, persistence might have saved time.
            if (currentAudioTime > 0 && Math.abs(audio.currentTime - currentAudioTime) > 1) {
                // Only if significant difference (avoid conflict with seek)
                // But wait, if we switch track, currentAudioTime in store is reset to 0 by store action?
                // Yes, store.playNext sets currentAudioTime: 0.
                // So this only applies if we reload page.
                audio.currentTime = currentAudioTime;
            }
        }

        // 3. Play if needed
        // If isPlaying was true, we continue playing.
        if (isPlaying) {
             const playPromise = audio.play();
             if (playPromise !== undefined) {
                 playPromise.catch(error => {
                     console.error("Auto-play failed:", error);
                     setIsPlaying(false);
                 });
             }
        }

      } catch (err: any) {
        if (cancelled || requestId !== requestIdRef.current) return;
        console.error("Audio load failed:", err);
        toast.error(`无法播放: ${currentTrack.name}`);
        
        // Auto skip to next
        playNext(currentTrack); 
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, quality]); 
  // Note: we don't depend on isPlaying here. 
  // If isPlaying toggles, the other effect handles it.
  // But if we load a new track, we check isPlaying to decide auto-play.


  // Event Handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const now = Date.now();
      // Throttle store updates to every 1s
      if (now - lastSaveTimeRef.current > 1000) {
        setAudioCurrentTime(audio.currentTime);
        lastSaveTimeRef.current = now;
      }
    };

    const onDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        // Next track
        if (queue.length > 0) {
            const nextIndex = (currentIndex + 1) % queue.length;
            useMusicStore.getState().setCurrentIndex(nextIndex);
        }
      }
    };
    
    const onError = (e: any) => {
        console.error("Audio Error Event:", e);
        setIsLoading(false);
    };
    
    const onPause = () => {
        // Only update if we think we are playing (sync external pauses like headphones)
        // But be careful of loops.
        // If we trigger pause via store, this event fires. Store is already false.
        // If system pauses, store is true. We should set to false.
        // Check if it was intentional?
        if (isPlaying && !audio.ended && audio.error === null && audio.paused) {
             setIsPlaying(false);
        }
    };
    
    const onPlay = () => {
        if (!isPlaying) {
            setIsPlaying(true);
        }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [isRepeat, currentTrack, isPlaying, setIsPlaying, setAudioCurrentTime, setDuration]);

  // Media Session
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.name,
      artist: currentTrack.artist?.join("/") ?? "Unknown",
      album: currentTrack.album ?? "",
      artwork: []
    });

    // We can fetch cover async and update metadata
    if (currentTrack.pic_id) {
        musicApi.getPic(currentTrack.pic_id, currentTrack.source).then(url => {
            if (url && navigator.mediaSession.metadata) {
                navigator.mediaSession.metadata.artwork = [{ src: url, sizes: "300x300", type: "image/jpeg" }];
            }
        });
    }

    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("nexttrack", () => {
         if (queue.length > 0) {
            const nextIndex = (currentIndex + 1) % queue.length;
            useMusicStore.getState().setCurrentIndex(nextIndex);
         }
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        // Logic for previous: restart if > 3s, else go to previous.
        // store doesn't have playPrevious yet?
        // useAudioPlayer had it. Store has currentIndex.
        // We can implement simple logic here or add to store.
        // Let's just implement simple prev logic.
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            setAudioCurrentTime(0);
        } else {
             // Go to previous index
             // Store handles this? No.
             // We need playPrevious in store or manipulate index.
             // Let's use simple index manipulation.
             const prevIndex = currentIndex - 1;
             // Handle loop if needed
             // For now just set index.
             useMusicStore.getState().setCurrentIndex(prevIndex < 0 ? queue.length - 1 : prevIndex);
        }
    });
    navigator.mediaSession.setActionHandler("seekto", (e) => {
        if (e.seekTime != null && audioRef.current) {
            audioRef.current.currentTime = e.seekTime;
            setAudioCurrentTime(e.seekTime);
        }
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    };
  }, [currentTrack, setIsPlaying, playNext, currentIndex, queue.length]);

  return (
    <audio
      ref={audioRef}
      className="hidden"
      preload="auto"
      playsInline // Important for mobile
    />
  );
}
