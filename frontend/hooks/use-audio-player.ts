import { useState, useRef, useEffect } from "react"
import { FileItem } from "@/lib/types"

export interface AudioPlayerState {
  currentTrackIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isRepeat: boolean
  isShuffle: boolean
}

export interface AudioPlayerControls {
  playTrack: (index: number) => void
  togglePlay: () => void
  handleNext: () => void
  handlePrevious: () => void
  handleSeek: (value: number[]) => void
  handleVolumeChange: (value: number[]) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  toggleMute: () => void
}

export function useAudioPlayer(audioFiles: FileItem[]) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentFile = audioFiles[currentTrackIndex]

  /* ---------- 播放控制核心 ---------- */

  const playTrack = (index: number) => {
    setCurrentTrackIndex(index)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const getNextIndex = () => {
    if (audioFiles.length === 0) return 0

    if (isShuffle) {
      let next = currentTrackIndex
      while (next === currentTrackIndex && audioFiles.length > 1) {
        next = Math.floor(Math.random() * audioFiles.length)
      }
      return next
    }

    return (currentTrackIndex + 1) % audioFiles.length
  }

  const handleNext = () => {
    playTrack(getNextIndex())
  }

  const handlePrevious = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0
    } else {
      const prevIndex = (currentTrackIndex - 1 + audioFiles.length) % audioFiles.length
      playTrack(prevIndex)
    }
  }

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    setIsMuted(false)
  }

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat)
  }

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  /* ---------- audio DOM 同步 ---------- */

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrackIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onDuration = () => setDuration(audio.duration)
    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0
        audio.play()
      } else {
        handleNext()
      }
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("durationchange", onDuration)
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("durationchange", onDuration)
      audio.removeEventListener("ended", onEnded)
    }
  }, [isRepeat, currentTrackIndex, audioFiles.length])

  /* ---------- 确保索引有效 ---------- */
  useEffect(() => {
    if (currentTrackIndex >= audioFiles.length && audioFiles.length > 0) {
      setCurrentTrackIndex(0)
      setIsPlaying(false)
    }
  }, [audioFiles.length, currentTrackIndex])

  return {
    state: {
      currentTrackIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      isRepeat,
      isShuffle,
    },
    controls: {
      playTrack,
      togglePlay,
      handleNext,
      handlePrevious,
      handleSeek,
      handleVolumeChange,
      toggleRepeat,
      toggleShuffle,
      toggleMute,
    },
    audioRef,
    currentFile,
  }
}