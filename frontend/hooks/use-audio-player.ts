import { useState, useRef, useEffect, useCallback } from "react"
import { FileItem } from "@shared/types"
import { useMusicStore } from "@/stores/music-store"

/**
 * 音频播放器 Hook
 */

export interface AudioPlayerState {
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isRepeat: boolean
  isShuffle: boolean
  isLoading: boolean
}

export interface AudioPlayerControls {
  playTrack: (index: number) => void
  togglePlay: () => void
  play: () => void
  pause: () => void
  next: () => void
  previous: () => void
  seek: (value: number[]) => void
  setVolume: (value: number) => void
  setVolumeValue: (value: number[]) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  toggleMute: () => void
  setLoading: (loading: boolean) => void
}

export function useAudioPlayer(audioFiles: FileItem[]) {
  /* ---------- Store ---------- */
  const {
    volume,
    isRepeat,
    isShuffle,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    currentIndex,
    setCurrentIndex,
    currentAudioTime,
    setAudioCurrentTime,
  } = useMusicStore()

  /* ---------- Local State ---------- */
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const lastSaveTimeRef = useRef(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentFile = audioFiles[currentIndex]

  /* ---------- Utils ---------- */

  const getIndexByStep = useCallback(
    (step: 1 | -1) => {
      const len = audioFiles.length
      if (!len) return 0

      if (isShuffle && len > 1) {
        let next = currentIndex
        while (next === currentIndex) {
          next = Math.floor(Math.random() * len)
        }
        return next
      }

      return (currentIndex + step + len) % len
    },
    [audioFiles.length, currentIndex, isShuffle],
  )

  /* ---------- Atomic Controls ---------- */

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime)
    }
  }, [setAudioCurrentTime])

  /* ---------- Public Controls ---------- */

  const playTrack = useCallback(
    (index: number) => {
      if (!audioFiles.length) return
      setCurrentIndex(index)
    },
    [audioFiles.length, setCurrentIndex],
  )

  const togglePlay = useCallback(() => {
    isPlaying ? pause() : play()
  }, [isPlaying, play, pause])

  const next = useCallback(() => {
    playTrack(getIndexByStep(1))
  }, [getIndexByStep, playTrack])

  const previous = useCallback(() => {
    playTrack(getIndexByStep(-1))
  }, [getIndexByStep, playTrack])

  const seek = useCallback((value: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value[0]
    setCurrentTime(value[0])
    setAudioCurrentTime(value[0])
  }, [setAudioCurrentTime])

  const toggleMute = useCallback(() => {
    setVolume(volume === 0 ? 0.7 : 0)
  }, [volume, setVolume])

  const setVolumeValue = useCallback(
    (value: number[]) => setVolume(value[0]),
    [setVolume],
  )

  const setLoading = useCallback(
    (loading: boolean) => setIsLoading(loading),
    []
  )

  /* ---------- Media Session ---------- */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentFile) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentFile.name,
      artist: (currentFile as any)?.artist?.join("/") ?? "Unknown",
      album: (currentFile as any)?.album ?? "",
    })

    navigator.mediaSession.setActionHandler("play", play)
    navigator.mediaSession.setActionHandler("pause", pause)
    navigator.mediaSession.setActionHandler("nexttrack", next)
    navigator.mediaSession.setActionHandler("previoustrack", previous)
    navigator.mediaSession.setActionHandler("seekto", (e) => {
      if (e.seekTime != null) seek([e.seekTime])
    })

    return () => {
      navigator.mediaSession.setActionHandler("play", null)
      navigator.mediaSession.setActionHandler("pause", null)
      navigator.mediaSession.setActionHandler("nexttrack", null)
      navigator.mediaSession.setActionHandler("previoustrack", null)
      navigator.mediaSession.setActionHandler("seekto", null)
    }
  }, [currentFile, play, pause, next, previous, seek])

  /* ---------- Audio DOM Sync ---------- */

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      const now = Date.now()
      setCurrentTime(audio.currentTime)
      
      // Throttle save to store (every 2 seconds)
      if (now - lastSaveTimeRef.current > 2000) {
        setAudioCurrentTime(audio.currentTime)
        lastSaveTimeRef.current = now
      }
    }
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        setAudioCurrentTime(0);
        play();
      } else {
        next()
      }
    }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("durationchange", onDurationChange)
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("durationchange", onDurationChange)
      audio.removeEventListener("ended", onEnded)
    }
  }, [isRepeat, next, play, setAudioCurrentTime])

  /* ---------- Edge ---------- */

  useEffect(() => {
    if (!audioFiles.length) return;
    if (currentIndex >= audioFiles.length) {
      setCurrentIndex(0);
      pause();
    }
  }, [audioFiles.length, currentIndex, pause, setCurrentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentAudioTime > 0 && audio.currentTime === 0) {
      audio.currentTime = currentAudioTime;
      setCurrentTime(currentAudioTime);
    }
  }, [currentIndex, currentAudioTime]);

  // Reset loading state when track changes
  useEffect(() => {
    setIsLoading(false);
  }, [currentIndex]);

  /* ---------- Export ---------- */

  return {
    state: {
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      isRepeat,
      isShuffle,
      isLoading,
    },
    controls: {
      playTrack,
      togglePlay,
      play,
      pause,
      next,
      previous,
      seek,
      setVolume,
      setVolumeValue,
      toggleRepeat,
      toggleShuffle,
      toggleMute,
      setLoading,
    },
    audioRef,
    currentFile,
  }
}
