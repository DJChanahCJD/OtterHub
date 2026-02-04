"use client";

import { useEffect, useState, useRef } from 'react';
import { useMusicStore } from '@/stores/music-store';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { musicApi, MusicTrack } from '@/lib/music-api';
import { toast } from 'sonner';

import { MusicLayout } from '@/components/music/MusicLayout';
import { MusicSidebar } from '@/components/music/MusicSidebar';
import { MusicSearchView } from '@/components/music/MusicSearchView';
import { MusicPlaylistView } from '@/components/music/MusicPlaylistView';
import { GlobalPlayer } from '@/components/music/GlobalPlayer';

export default function MusicPage() {
  // Store
  const { 
    queue, 
    playContext, 
    favorites,
    playlists,
    removeFromFavorites,
    removeFromUserPlaylist,
  } = useMusicStore();

  // Local View State
  const [currentView, setCurrentView] = useState<"search" | "favorites" | "playlist">("search");
  const [activePlaylistId, setActivePlaylistId] = useState<string>();
  const [quality, setQuality] = useState("320");

  // Audio Player Hook
  // We pass the queue to the hook. The hook manages audio element.
  const { state, controls, audioRef } = useAudioPlayer(queue as any[]);
  const currentTrack = queue[state.currentTrackIndex];

  // Load Audio Source
  const isPlayingRef = useRef(state.isPlaying);
  useEffect(() => {
    isPlayingRef.current = state.isPlaying;
  }, [state.isPlaying]);
  
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const loadSrc = async () => {
      // 立即暂停旧音频，防止切歌时播放上一首的残留内容
      audioRef.current?.pause();
      
      const trackId = currentTrack.id;

      try {
        const url = await musicApi.getUrl(currentTrack.id, currentTrack.source, parseInt(quality));
        
        // 确保组件未卸载且歌曲未再次切换
        if (url && audioRef.current && trackId === currentTrack.id) {
          if (audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.load();
            
            if (isPlayingRef.current) {
              audioRef.current.play()
                .then(() => controls.setPlaying(true))
                .catch((err) => {
                  if (err?.name === "NotAllowedError") {
                    toast.error("浏览器阻止自动播放，请点击播放按钮开始播放");
                    controls.setPlaying(false);
                    return;
                  }
                  console.error(err);
                });
            }
          }
        } else if (!url) {
          toast.error("无法获取播放链接");
          controls.next();
        }
      } catch (e) {
        console.error(e);
        controls.next();
      }
    };
    
    loadSrc();
  }, [currentTrack?.id, quality]);

  // Handlers
  const handlePlayContext = (track: MusicTrack, list: MusicTrack[]) => {
    // Toggle play if same track
    if (currentTrack?.id === track.id) {
      controls.togglePlay();
      return;
    }

    // Find index of track in list
    const index = list.findIndex(t => t.id === track.id);
    if (index === -1) return;

    // Check if we are already playing this context
    // Simple check: same length and same first item ID
    const isSameContext = queue.length === list.length && queue[0]?.id === list[0]?.id;

    if (isSameContext) {
      controls.playTrack(index);
      controls.setPlaying(true);
    } else {
      playContext(list, index);
      controls.setPlaying(true);
      // Hook sync will happen via useEffect
    }
  };

  const handlePlayInPlaylist = (track: MusicTrack, index: number) => {
    // Toggle play if same track
    if (currentTrack?.id === track.id) {
      controls.togglePlay();
      return;
    }

    // For playlist views, we already know the list and index
    const list = currentView === 'favorites' 
      ? favorites 
      : playlists.find(p => p.id === activePlaylistId)?.tracks || [];
    
    playContext(list, index);
    controls.setPlaying(true);
  };

  // Render Content
  const renderContent = () => {
    return (
      <div className="h-full w-full relative">
        {/* Search View (Hidden to preserve state) */}
        <div className={currentView === 'search' ? 'h-full w-full' : 'hidden'}>
          <MusicSearchView 
            onPlay={handlePlayContext} 
            currentTrackId={currentTrack?.id}
            isPlaying={state.isPlaying}
          />
        </div>

        {/* Favorites View */}
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

        {/* User Playlist View */}
        {currentView === 'playlist' && activePlaylistId && (
          <MusicPlaylistView 
            title={playlists.find(p => p.id === activePlaylistId)?.name || "歌单"}
            description={`创建于 ${new Date(playlists.find(p => p.id === activePlaylistId)?.createdAt || 0).toLocaleDateString()}`}
            tracks={playlists.find(p => p.id === activePlaylistId)?.tracks || []}
            onPlay={handlePlayInPlaylist}
            onRemove={(t) => removeFromUserPlaylist(activePlaylistId, t.id)}
            currentTrackId={currentTrack?.id}
            isPlaying={state.isPlaying}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      <MusicLayout
        sidebar={
          <MusicSidebar 
            currentView={currentView}
            currentPlaylistId={activePlaylistId}
            onViewChange={(v, pid) => {
              setCurrentView(v);
              if (pid) setActivePlaylistId(pid);
            }}
          />
        }
        player={
          <GlobalPlayer 
            state={state} 
            controls={controls}
            quality={quality}
            onQualityChange={setQuality}
            currentTrack={currentTrack}
          />
        }
      >
        {renderContent()}
      </MusicLayout>
    </>
  );
}
