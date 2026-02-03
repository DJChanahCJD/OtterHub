"use client";

import { useEffect, useState } from 'react';
import { MusicHeader } from '@/components/music/MusicHeader';
import { SongCard } from '@/components/music/SongCard';
import { PlaylistPanel } from '@/components/music/PlaylistPanel';
import { LyricsPanel } from '@/components/music/LyricsPanel';
import { GlobalPlayer } from '@/components/music/GlobalPlayer';
import { useMusicStore } from '@/stores/music-store';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { musicApi, MusicSource, MusicTrack } from '@/lib/music-api';
import { toast } from 'sonner';

export default  function MusicPage() {
  const { playlist, addToPlaylist, setPlaylist } = useMusicStore();
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentSource, setCurrentSource] = useState<MusicSource>('netease');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [quality, setQuality] = useState("320");

  // Cast playlist to any because MusicTrack might not match FileItem exactly, 
  // but we only need the array length/index for the hook logic.
  const { state, controls, audioRef } = useAudioPlayer(playlist as any[]);
  
  const currentTrack = playlist[state.currentTrackIndex];

  const handleSearchRequest = async (query: string, source: MusicSource) => {
      setCurrentQuery(query);
      setCurrentSource(source);
      setCurrentPage(1);
      setHasMore(true);
      setSearchResults([]);
      
      try {
          const results = await musicApi.search(query, source, 1);
          setSearchResults(results);
          if (results.length < 20) setHasMore(false); // Assuming 20 is default
      } catch (e) {
          toast.error("搜索失败");
      }
  };
  
  const handleLoadMore = async () => {
      if (!hasMore || isLoadingMore) return;
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      try {
          const newResults = await musicApi.search(currentQuery, currentSource, nextPage);
          if (newResults.length > 0) {
              setSearchResults(prev => [...prev, ...newResults]);
              setCurrentPage(nextPage);
              if (newResults.length < 20) setHasMore(false);
          } else {
              setHasMore(false);
          }
      } catch (e) {
          toast.error("加载更多失败");
      } finally {
          setIsLoadingMore(false);
      }
  };

  // Handle Play Request (from PlaylistPanel)
  const handlePlay = (track: MusicTrack, list: MusicTrack[]) => {
    // If playing from a list (search results or favorites), we should update the current playlist?
    // User requirement: "Front-end maintains a playlist (based on current filter results)"
    // If I click a song in Search Results, should the WHOLE search result list become the playlist?
    // Usually yes.
    
    // Check if we are just switching track in current playlist
    const indexInCurrent = playlist.findIndex(t => t.id === track.id);
    const listIsSame = list.length === playlist.length && list[0]?.id === playlist[0]?.id; // Rough check

    if (listIsSame && indexInCurrent !== -1) {
      controls.playTrack(indexInCurrent);
    } else {
      // Replace playlist
      setPlaylist(list);
      // We need to wait for playlist update to reflect in hook?
      // Zustand updates are sync usually.
      // But useAudioPlayer depends on playlist.
      // We need to find the new index.
      const newIndex = list.findIndex(t => t.id === track.id);
      // We might need a small timeout or useEffect to play the new index after playlist update.
      // Actually, if we setPlaylist, the component re-renders.
      // But controls.playTrack might refer to old playlist if captured in closure?
      // useAudioPlayer uses `audioFiles` from props in `playTrack`? 
      // No, `playTrack` uses `audioFiles.length`.
      // It sets `setCurrentTrackIndex(index)`.
      
      // So:
      setTimeout(() => controls.playTrack(newIndex), 0);
    }
  };

  // Sync Audio Source
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const loadSrc = async () => {
      try {
        const url = await musicApi.getUrl(currentTrack.id, currentTrack.source, parseInt(quality));
        if (url && audioRef.current) {
            // Only update if src changed (simple check)
            if (audioRef.current.src !== url) {
                audioRef.current.src = url;
                if (state.isPlaying) {
                    audioRef.current.play().catch(e => {
                        console.error("Auto-play failed:", e);
                        // Interact to play might be needed
                    });
                }
            }
        } else {
            toast.error("无法获取播放链接");
            // Auto skip?
            // controls.next();
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadSrc();
  }, [currentTrack?.id, quality]); // Depend on ID, not object ref

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex-none">
        <MusicHeader onSearch={handleSearchRequest} loading={isLoadingMore && currentPage === 1} />
      </div>

      {/* Main Content (3 Columns) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_1fr_350px] divide-y md:divide-y-0 md:divide-x">
        {/* Left: Song Card */}
        <div className="h-full overflow-hidden">
            <SongCard track={currentTrack || null} />
        </div>

        {/* Middle: Playlist */}
        <div className="h-full overflow-hidden">
            <PlaylistPanel 
                searchResults={searchResults} 
                onPlay={handlePlay}
                currentTrackId={currentTrack?.id}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
            />
        </div>

        {/* Right: Lyrics */}
        <div className="h-full overflow-hidden bg-muted/5">
            <LyricsPanel track={currentTrack || null} currentTime={state.currentTime} />
        </div>
      </div>

      {/* Footer: Global Player */}
      <div className="flex-none">
        <GlobalPlayer 
            state={state} 
            controls={controls} 
            onQualityChange={setQuality}
            quality={quality}
        />
      </div>
    </div>
  );
}
