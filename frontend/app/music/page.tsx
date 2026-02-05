"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useMusicStore } from '@/stores/music-store';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { MusicTrack } from '@shared/types';
import { musicApi } from '@/lib/music-api';
import { toast } from 'sonner';
import { format } from "date-fns";

import { MusicLayout } from '@/components/music/MusicLayout';
import { MusicSidebar } from '@/components/music/MusicSidebar';
import { MusicSearchView } from '@/components/music/MusicSearchView';
import { MusicPlaylistView } from '@/components/music/MusicPlaylistView';
import { NetEaseView } from '@/components/music/external/NetEaseView';
import { GlobalPlayer } from '@/components/music/GlobalPlayer';
import { retry } from '@/lib/utils';

export default function MusicPage() {

  const { 
    queue, 
    playContext, 
    favorites,
    playlists,
    removeFromFavorites,
    removeFromPlaylist,
    renamePlaylist,
    deletePlaylist,
    clearQueue,
    quality,
    currentIndex,
    currentAudioTime: savedTime
  } = useMusicStore();

  const [currentView, setCurrentView] = useState<"search" | "favorites" | "playlist" | "queue" | "netease">("search");
  const [activePlaylistId, setActivePlaylistId] = useState<string>();

  const { state, controls, audioRef } = useAudioPlayer(queue as any[]);
  const currentTrack = queue[currentIndex];

  /* ---------------- 自动播放状态锁 ---------------- */
  const isPlayingRef = useRef(state.isPlaying);
  useEffect(() => { isPlayingRef.current = state.isPlaying }, [state.isPlaying]);

  /* ---------------- 防止旧请求覆盖新歌 ---------------- */
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const trackSnapshot = currentTrack; // 锁定歌曲
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const load = async () => {
      const audio = audioRef.current!;
      controls.setLoading(true);
      audio.pause();

      try {
        const url = await retry(
          () => musicApi.getUrl(trackSnapshot.id, trackSnapshot.source, parseInt(quality)),
          2,
          600
        );

        if (!url) throw new Error("EMPTY_URL");
        if (cancelled || requestId !== requestIdRef.current) return;

        if (audio.src !== url) {
          audio.src = url;

          if (savedTime > 0) audio.currentTime = savedTime;
          audio.load();
        }

        if (!isPlayingRef.current) return;

        try {
          await audio.play();
          controls.play();
        } catch (err: any) {
          if (cancelled || requestId !== requestIdRef.current) return;

          // 浏览器策略阻止
          if (err?.name === "NotAllowedError") {
            toast.info("浏览器阻止自动播放，请点击播放");
            controls.pause();
            return;
          }

          throw err; // 真正播放失败
        }

      } catch (err: any) {
        if (cancelled || requestId !== requestIdRef.current) return;

        console.error("audio load failed:", err);

        toast.error("该歌曲无法播放，已跳过");
        controls.next();
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          controls.setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true };

  }, [currentTrack?.id, quality]);


  /* ---------------- 播放逻辑 ---------------- */

  const handlePlayContext = (track: MusicTrack, list: MusicTrack[]) => {
    if (currentTrack?.id === track.id) {
      controls.togglePlay();
      return;
    }

    const index = list.findIndex(t => t.id === track.id);
    if (index === -1) return;

    const isSameContext = queue.length === list.length && queue[0]?.id === list[0]?.id;

    if (isSameContext) {
      controls.playTrack(index);
      controls.play();
    } else {
      playContext(list, index);
      controls.play();
    }
  };

  const handlePlayInPlaylist = (track: MusicTrack | null, index?: number) => {
    if (track && index !== undefined && currentTrack?.id === track.id) {
      controls.togglePlay();
      return;
    }

    const list = currentView === 'favorites' 
      ? favorites 
      : currentView === 'queue'
      ? queue
      : playlists.find(p => p.id === activePlaylistId)?.tracks || [];

    playContext(list, index);
    controls.play();
  };

  /* ---------------- UI ---------------- */

  const renderContent = () => (
    <div className="h-full w-full relative">

      <div className={currentView === 'search' ? 'h-full w-full' : 'hidden'}>
        <MusicSearchView 
          onPlay={handlePlayContext} 
          currentTrackId={currentTrack?.id}
          isPlaying={state.isPlaying}
        />
      </div>

      {currentView === 'netease' && (
        <NetEaseView />
      )}

      {currentView === 'favorites' && (
        <MusicPlaylistView 
          title="我的喜欢"
          tracks={favorites}
          onPlay={handlePlayInPlaylist}
          onRemove={(t) => removeFromFavorites(t.id)}
          currentTrackId={currentTrack?.id}
          isPlaying={state.isPlaying}
        />
      )}

      {currentView === 'playlist' && activePlaylistId && (
        <MusicPlaylistView 
          title={playlists.find(p => p.id === activePlaylistId)?.name || "歌单"}
          description={`创建于 ${format(playlists.find(p => p.id === activePlaylistId)?.createdAt || 0, 'yyyy-MM-dd')}`}
          tracks={playlists.find(p => p.id === activePlaylistId)?.tracks || []}
          playlistId={activePlaylistId}
          onPlay={handlePlayInPlaylist}
          onRemove={(t) => removeFromPlaylist(activePlaylistId, t.id)}
          onRename={renamePlaylist}
          onDelete={(id) => {
            deletePlaylist(id);
            if (activePlaylistId === id) {
              setCurrentView('search');
              setActivePlaylistId(undefined);
            }
          }}
          currentTrackId={currentTrack?.id}
          isPlaying={state.isPlaying}
        />
      )}

      {currentView === 'queue' && (
        <MusicPlaylistView 
          title="播放队列"
          description={`共 ${queue.length} 首歌曲`}
          tracks={queue}
          onPlay={handlePlayInPlaylist}
          onRemove={(t) => {
            // 从队列中移除歌曲
            const newQueue = queue.filter(item => item.id !== t.id);
            playContext(newQueue, Math.min(currentIndex, newQueue.length - 1));
          }}
          onDelete={() => {
            if (confirm('确定清空播放队列吗？')) {
              clearQueue();
            }
          }}
          currentTrackId={currentTrack?.id}
          isPlaying={state.isPlaying}
        />
      )}
    </div>
  );

  const sidebar = useMemo(() => (
    <MusicSidebar 
      currentView={currentView}
      currentPlaylistId={activePlaylistId}
      onViewChange={(v, pid) => {
        setCurrentView(v);
        if (pid) setActivePlaylistId(pid);
      }}
    />
  ), [currentView, activePlaylistId]);

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      <MusicLayout
        sidebar={sidebar}
        player={
          <GlobalPlayer 
            state={state} 
            controls={controls}
            currentTrack={currentTrack}
          />
        }
      >
        {renderContent()}
      </MusicLayout>
    </>
  );
}
