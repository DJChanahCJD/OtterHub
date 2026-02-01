import { useState, useRef, useEffect, useCallback } from "react"
import { FileItem } from "@shared/types"

/**
 * 音频播放器 Hook
 */

enum PlayMode {
  Sequence = 'sequence',
  SingleLoop = 'singleLoop',
  ListLoop = 'listLoop',
  Shuffle = 'shuffle'
}

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
  next: () => void
  previous: () => void
  seek: (value: number[]) => void
  setVolume: (value: number[]) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  toggleMute: () => void
}

export function useAudioPlayer(audioFiles: FileItem[]) {
  /* ---------- 播放状态 ---------- */

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentFile = audioFiles[currentTrackIndex]

  /* ---------- 工具函数 ---------- */

  /**
   * 计算下一首索引
   * - shuffle 时避免连续重复
   * - 非 shuffle 时循环播放
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

  /* ---------- 播放控制（唯一入口） ---------- */

  /**
   * 播放指定索引的音频
   * - 统一入口，避免多处直接操作 audio
   */
  const playTrack = (index: number) => {
    if (!audioRef.current || audioFiles.length === 0) return

    setCurrentTrackIndex(index)
    setIsPlaying(true)

    // 切歌时重置时间，防止残留
    audioRef.current.currentTime = 0
  }

  const togglePlay = () => {
    setIsPlaying((v) => !v)
  }

  const next = () => {
    playTrack(getNextIndex(currentTrackIndex))
  }

  const previous = () => {
    const audio = audioRef.current
    if (!audio) return

    const prevIndex =
      (currentTrackIndex - 1 + audioFiles.length) % audioFiles.length
    playTrack(prevIndex)
  }

  const seek = (value: number[]) => {
    if (!audioRef.current) return

    audioRef.current.currentTime = value[0]
    setCurrentTime(value[0])
  }

  /* ---------- 音量控制 ---------- */

  const toggleMute = () => {
    // volume = 0 视为 mute，避免双状态源
    setVolume((v) => (v === 0 ? 0.7 : 0))
  }

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
      audio.play().catch(() => {
        // 浏览器策略可能拒绝自动播放，保持状态即可
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrackIndex])

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
        playTrack(getNextIndex(currentTrackIndex))
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
  }, [currentTrackIndex, isRepeat, getNextIndex])

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
  }, [audioFiles.length, currentTrackIndex])

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
      next,
      previous,
      seek,
      setVolume,
      toggleRepeat: () => setIsRepeat((v) => !v),
      toggleShuffle: () => setIsShuffle((v) => !v),
      toggleMute,
    },
    audioRef,
    currentFile,
  }
}