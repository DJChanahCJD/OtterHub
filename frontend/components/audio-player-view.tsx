"use client"

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useBucketItems, useFileStore } from "@/lib/file-store"
import { cn, downloadFile, formatMediaTime } from "@/lib/utils"
import { FileItem, FileType } from "@/lib/types"
import { getFileUrl } from "@/lib/api"
import { useAudioPlayer } from "@/hooks/use-audio-player"

export function AudioPlayerView() {
  const audioFiles = useBucketItems(FileType.Audio)
  const selectedKeys = useFileStore((s) => s.selectedKeys)

  const {
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
  } = useAudioPlayer(audioFiles)

  const handleDownload = (file: FileItem) => {
    downloadFile(getFileUrl(file.name), file.metadata.fileName)
  }

  if (audioFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-32 h-32 mb-6 opacity-50 flex items-center justify-center">
          <Volume2 className="h-24 w-24 text-white/20" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2">No audio files</h3>
        <p className="text-white/60 max-w-md">Upload some audio files to start enjoying your music collection.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Now Playing Section */}
      <div className="backdrop-blur-xl bg-linear-to-br from-emerald-500/10 to-teal-500/10 border border-white/10 rounded-2xl p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          {/* Album Art */}
          <div className="w-full lg:w-64 aspect-square rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-400/20 to-teal-400/20 animate-pulse" />
            <div className="relative z-10">
              <Volume2 className="h-24 w-24 text-emerald-300" />
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex-1 w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 text-balance">{currentFile?.metadata?.fileName || "No file"}</h2>
              <p className="text-emerald-300/80">{"Unknown Artist"}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-white/60">
                <span>{formatMediaTime(currentTime)}</span>
                <span>{formatMediaTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={cn("text-white/60 hover:text-white hover:bg-white/10", isShuffle && "text-emerald-400")}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="text-white hover:text-white hover:bg-white/10"
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                onClick={togglePlay}
                className="h-14 w-14 rounded-full bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="text-white hover:text-white hover:bg-white/10"
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRepeat}
                className={cn("text-white/60 hover:text-white hover:bg-white/10", isRepeat && "text-emerald-400")}
              >
                <Repeat className="h-5 w-5" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-32 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        {currentFile && <audio ref={audioRef} src={getFileUrl(currentFile.name)} />}
      </div>

      {/* Playlist */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Playlist</h3>

        <div className="space-y-2">
          {audioFiles.map((file, index) => {
            const isCurrentTrack = index === currentTrackIndex
            const isSelected = selectedKeys.includes(file.name)

            return (
              <div
                key={file.name}
                onClick={() => playTrack(index)}
                className={cn(
                  "group flex items-center gap-4 p-3 rounded-lg transition-all cursor-pointer",
                  isCurrentTrack && "bg-emerald-500/20 border border-emerald-400/50",
                  !isCurrentTrack && "hover:bg-white/5",
                  isSelected && "bg-emerald-500/10",
                )}
              >
                {/* Track Number / Play Indicator */}
                <div className="w-8 flex items-center justify-center">
                  {isCurrentTrack && isPlaying ? (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-4 bg-emerald-400 animate-[audio-bar_0.8s_ease-in-out_infinite]" />
                      <div className="w-1 h-4 bg-emerald-400 animate-[audio-bar_0.8s_ease-in-out_0.2s_infinite]" />
                      <div className="w-1 h-4 bg-emerald-400 animate-[audio-bar_0.8s_ease-in-out_0.4s_infinite]" />
                    </div>
                  ) : (
                    <span className="text-sm text-white/40">{index + 1}</span>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", isCurrentTrack ? "text-emerald-300" : "text-white")}>
                    {file.metadata.fileName}
                  </p>
                  <p className="text-xs text-white/40">{"Unknown Artist"}</p>
                </div>

                {/* Duration */}
                <div className="text-xs text-white/40">
                  {file.metadata?.duration ? formatMediaTime(file.metadata.duration) : "--:--"}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(file)
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
