import { useState, useRef, useEffect, useCallback } from "react"
import { FileItem } from "@shared/types"
import { useMusicStore } from "@/stores/music-store"
import { musicApi } from "@/lib/music-api"

/**
 * 音频播放器 Hook
 */

export interface AudioPlayerState {
  currentTrackIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isRepeat: boolean
  isShuffle: boolean
}

export interface AudioPlayerControls {
  playTrack: (index: number) => void
  togglePlay: () => void
  setPlaying: (isPlaying: boolean) => void
  next: () => void
  previous: () => void
  seek: (value: number[]) => void
  setVolume: (value: number) => void
  setVolumeValue: (value: number[]) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  toggleMute: () => void
}

export function useAudioPlayer(audioFiles: FileItem[]) {
  /* ---------- 状态管理 (Store) ---------- */
  const {
    volume,
    isRepeat,
    isShuffle,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    queue,
    currentIndex: currentTrackIndex,
    setCurrentIndex: setCurrentTrackIndex
  } = useMusicStore()

  /* ---------- 播放状态 (Local) ---------- */
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentFile = audioFiles[currentTrackIndex]

  /* ---------- 工具函数 ---------- */

  /**
   * 计算下一首索引
   */
  const getNextIndex = useCallback(
    (from: number) => {
      if (audioFiles.length === 0) return 0

      if (isShuffle) {
        let next = from
        while (next === from && audioFiles.length > 1) {
          next = Math.floor(Math.random() * audioFiles.length)
        }
        return next
      }

      return (from + 1) % audioFiles.length
    },
    [audioFiles.length, isShuffle],
  )

  const getPrevIndex = useCallback(
    (from: number) => {
      if (audioFiles.length === 0) return 0
      if (isShuffle) return getNextIndex(from)
      return (from - 1 + audioFiles.length) % audioFiles.length
    },
    [audioFiles.length, isShuffle, getNextIndex]
  )

  /* ---------- 播放控制（唯一入口） ---------- */

  const playTrack = useCallback((index: number) => {
    if (!audioRef.current || audioFiles.length === 0) return

    setCurrentTrackIndex(index)
    // 移除自动 setIsPlaying(true)，由外部（如页面加载完成后）控制
    // 移除 currentTime 重置，防止旧音频被重置后播放
  }, [audioFiles.length, setCurrentTrackIndex])

  const togglePlay = useCallback(() => {
    setIsPlaying((v) => !v)
  }, [])

  const setPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [])

  const next = useCallback(() => {
    playTrack(getNextIndex(currentTrackIndex))
  }, [playTrack, getNextIndex, currentTrackIndex])

  const previous = useCallback(() => {
    if (!audioRef.current) return
    playTrack(getPrevIndex(currentTrackIndex))
  }, [playTrack, getPrevIndex, currentTrackIndex])

  const seek = useCallback((value: number[]) => {
    if (!audioRef.current) return

    audioRef.current.currentTime = value[0]
    setCurrentTime(value[0])
  }, [])

  /* ---------- 音量控制 ---------- */

  const toggleMute = useCallback(() => {
    setVolume(volume === 0 ? 0.7 : 0)
  }, [volume, setVolume])

  const setVolumeValue = useCallback((value: number[]) => {
    setVolume(value[0])
  }, [setVolume])

  /* ---------- Media Session API ---------- */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentFile) return;

    // 更新元数据
    const metadata: MediaMetadataInit = {
      title: currentFile.name,
      artist: 'artist' in currentFile ? (currentFile as any).artist.join('/') : 'Unknown',
      album: 'album' in currentFile ? (currentFile as any).album : '',
      artwork: 'pic_id' in currentFile ? [
         // 我们暂时无法直接获取图片 URL，除非 store 里存了。
         // 这里可以先留空，或者在 fetch cover 后更新
         // 如果有 picUrl 更好
      ] : []
    };
    navigator.mediaSession.metadata = new MediaMetadata(metadata);

    // 绑定事件
    navigator.mediaSession.setActionHandler('play', () => {
       setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
       setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', previous);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && details.fastSeek === false) {
           seek([details.seekTime]);
        }
    });

    return () => {
       navigator.mediaSession.setActionHandler('play', null);
       navigator.mediaSession.setActionHandler('pause', null);
       navigator.mediaSession.setActionHandler('previoustrack', null);
       navigator.mediaSession.setActionHandler('nexttrack', null);
       navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [currentFile, next, previous, seek]);


  /* ---------- DOM 同步 ---------- */

  // 同步音量
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
  }, [volume])

  // 同步播放 / 暂停
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setIsPlaying(false)
        })
      }
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // 监听音频事件
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0
        audio.play()
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
  }, [currentTrackIndex, isRepeat, next])

  /* ---------- 边界处理 ---------- */

  // 列表为空或变更时，重置播放器
  useEffect(() => {
    if (audioFiles.length === 0) {
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setCurrentTrackIndex(0)
    } else if (currentTrackIndex >= audioFiles.length) {
      setCurrentTrackIndex(0)
      setIsPlaying(false)
    }
  }, [audioFiles.length, currentTrackIndex, setCurrentTrackIndex])

  /* ---------- 对外暴露 ---------- */

  return {
    state: {
      currentTrackIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      isRepeat,
      isShuffle,
    },
    controls: {
      playTrack,
      togglePlay,
      setPlaying,
      next,
      previous,
      seek,
      setVolume,
      setVolumeValue,
      toggleRepeat,
      toggleShuffle,
      toggleMute,
    },
    audioRef,
    currentFile,
  }
}