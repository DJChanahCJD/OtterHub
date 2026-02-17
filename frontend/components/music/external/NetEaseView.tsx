import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { neteaseApi } from '@/lib/api/music-import';
import { neteaseStoreApi } from '@/lib/api/settings';
import { processBatch } from '@/lib/utils';
import { toast } from 'sonner';
import { useNetEaseStore, NetEaseProfile } from '@/stores/netease-store';
import { useMusicStore } from '@/stores/music-store';
import { MusicTrack } from '@shared/types';
import { LogOut, RefreshCw, Loader2, ChevronLeft, Plus, User, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MusicPlaylistView } from '@/components/music/MusicPlaylistView';
import { MusicCover } from '@/components/music/MusicCover';
import { MusicTrackList } from '@/components/music/MusicTrackList';
import { musicApi } from '@/lib/music-api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NetEaseView() {
  const { cookie, userId, setSession, clearSession } = useNetEaseStore();
  
  if (!cookie || !userId) {
    return <NetEaseLogin onLoginSuccess={setSession} />;
  }

  return <NetEaseBrowser cookie={cookie} userId={userId} onLogout={clearSession} />;
}

function NetEaseLogin({ onLoginSuccess }: { onLoginSuccess: (cookie: string, userId: string, profile: NetEaseProfile) => void }) {
  const [loading, setLoading] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  
  // QR Code State
  const [qrKey, setQrKey] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrStatus, setQrStatus] = useState<number>(0); // 800: expired, 801: waiting, 802: scanning, 803: success
  const [qrMessage, setQrMessage] = useState('');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initQrCode();
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
  };

  const initQrCode = async () => {
      try {
          stopPolling();
          const res = await neteaseApi.getQrKey();
          if (res.data && res.data.unikey) {
              const key = res.data.unikey;
              setQrKey(key);
              setQrUrl(`https://music.163.com/login?codekey=${key}`);
              setQrStatus(801);
              setQrMessage('Open NetEase App to scan');
              
              // Start polling
              const id = setInterval(() => checkStatus(key), 3000);
              intervalRef.current = id;
          }
      } catch (e) {
          console.error('Failed to init QR', e);
          setQrMessage('Failed to load QR code');
      }
  };

  const checkStatus = async (key: string) => {
      try {
          const res = await neteaseApi.checkQrStatus(key);
          const code = res.data.code;
          setQrStatus(code);
          setQrMessage(res.data.message);

          if (code === 800) {
              stopPolling();
              setQrMessage('QR Code expired, click to refresh');
          } else if (code === 803) {
              stopPolling();
              const cookie = res.cookie; // Use the cookie from headers/backend
              if (cookie) {
                  await handleLoginVerify(cookie);
              } else {
                  toast.error('Login successful but no cookie received');
              }
          }
      } catch (e) {
          // ignore polling errors
      }
  };

  const handleLoginVerify = async (cookie: string) => {
      setLoading(true);
      try {
          const profileRes = await neteaseApi.getMyInfo(cookie);
          if (profileRes.data.account && profileRes.data.profile) {
               toast.success('Login successful');
               const profile: NetEaseProfile = {
                   nickname: profileRes.data.profile.nickname,
                   avatarUrl: profileRes.data.profile.avatarUrl,
                   backgroundUrl: profileRes.data.profile.backgroundUrl,
                   signature: profileRes.data.profile.signature,
               };
               onLoginSuccess(cookie, profileRes.data.account.id, profile);
               
               // Auto sync to cloud
               try {
                   await neteaseStoreApi.update({
                       cookie,
                       userId: String(profileRes.data.account.id),
                       profile,
                       updatedAt: Date.now(),
                   });
                   toast.success('Account synced to cloud');
               } catch (e) {
                   console.error('Failed to sync account to cloud', e);
               }
          } else {
               toast.error('Login verification failed. Please try again.');
               setQrStatus(800);
               setQrMessage('Verification failed. Click to refresh QR.');
          }
      } catch (e: any) {
          toast.error(e.message);
          setQrStatus(800);
          setQrMessage('Verification error. Click to refresh QR.');
      } finally {
          setLoading(false);
      }
  };

  const handleManualLogin = () => {
    if (!cookieInput) return;
    handleLoginVerify(cookieInput);
  };

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Login to NetEase Music</CardTitle>
          <CardDescription>Scan QR code with NetEase App or use cookie</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Left: QR Code */}
             <div className="flex flex-col items-center justify-center space-y-4 border-r pr-8">
                <div className="text-sm font-medium text-muted-foreground mb-2">Scan with NetEase App</div>
                {qrUrl ? (
                    <div className="relative group">
                        <div className={`p-2 bg-white rounded-lg ${qrStatus === 800 ? 'opacity-20' : ''}`}>
                            <QRCodeSVG value={qrUrl} size={180} />
                        </div>
                        {qrStatus === 800 && (
                            <div 
                                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                                onClick={initQrCode}
                            >
                                <RefreshCw className="w-10 h-10 text-primary" />
                            </div>
                        )}
                        {qrStatus === 802 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                <span className="font-bold text-green-600">Scanned! Confirm on phone</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center bg-muted rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                )}
                <div className="text-center min-h-[20px]">
                    <p className={`text-sm ${qrStatus === 800 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {qrMessage}
                    </p>
                    {qrStatus === 800 && (
                        <Button variant="link" size="sm" onClick={initQrCode}>
                            Refresh QR Code
                        </Button>
                    )}
                </div>
             </div>

             {/* Right: Manual Cookie */}
             <div className="space-y-4">
               <div className="text-sm font-medium text-muted-foreground">Or enter cookie manually</div>
               <div className="space-y-2">
                 <Label>MUSIC_U Cookie</Label>
                 <Input 
                   value={cookieInput} 
                   onChange={(e) => setCookieInput(e.target.value)} 
                   placeholder="Paste your MUSIC_U cookie here..."
                 />
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    1. Open <a href="https://music.163.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">music.163.com</a><br/>
                    2. Press F12 &rarr; Application &rarr; Cookies<br/>
                    3. Copy 'MUSIC_U' value
                 </p>
               </div>
               <Button className="w-full" onClick={handleManualLogin} disabled={loading}>
                 {loading ? <Loader2 className="animate-spin h-4 w-4"/> : 'Verify & Login'}
               </Button>
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NetEaseBrowser({ cookie, userId, onLogout }: { cookie: string, userId: string, onLogout: () => void }) {
  const { playlists, setPlaylists, recommendPlaylists, setRecommendPlaylists, profile, setSession } = useNetEaseStore();
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  
  const [currentPlaylist, setCurrentPlaylist] = useState<any | null>(null);
  const [playlistDetail, setPlaylistDetail] = useState<MusicTrack[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  const { createPlaylist, addToPlaylist, playContext } = useMusicStore();

  const createdPlaylists = playlists.filter(p => p.userId.toString() === userId.toString());
  const subscribedPlaylists = playlists.filter(p => p.userId.toString() !== userId.toString());

  useEffect(() => {
    if (playlists.length === 0) {
      loadPlaylists();
    }
    if (recommendPlaylists.length === 0) {
        loadRecommend();
    }
    if (!profile && cookie) {
        loadProfile();
    }
  }, [cookie, userId, profile]);

  const loadProfile = async () => {
      try {
          const res = await neteaseApi.getMyInfo(cookie);
          if (res.data.profile) {
              const newProfile: NetEaseProfile = {
                   nickname: res.data.profile.nickname,
                   avatarUrl: res.data.profile.avatarUrl,
                   backgroundUrl: res.data.profile.backgroundUrl,
                   signature: res.data.profile.signature,
              };
              setSession(cookie, userId, newProfile);
          }
      } catch (e) {
          console.error("Failed to load profile", e);
      }
  };

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const res = await neteaseApi.getUserPlaylists(userId, cookie);
      if (res.code === 200) {
        setPlaylists(res.playlist);
      } else {
        toast.error('Failed to load playlists');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommend = async () => {
      setRecLoading(true);
      try {
          const res = await neteaseApi.getRecommendPlaylists(cookie);
          if (res.data && res.data.code === 200) {
              setRecommendPlaylists(res.data.result);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setRecLoading(false);
      }
  };

  const handlePlaylistClick = async (playlist: any) => {
      setCurrentPlaylist(playlist);
      setDetailLoading(true);
      try {
          const detail = await neteaseApi.getPlaylistDetail(playlist.id, cookie);
          // Update current playlist with full details (including creator if it was missing)
          if (detail) {
             setCurrentPlaylist((prev: any) => ({ ...prev, ...detail }));
          }

          if (detail.tracks) {
              const tracks: MusicTrack[] = detail.tracks.map((t: any) => ({
                    id: `ne_track_${t.id}`,
                    name: t.name,
                    artist: t.ar.map((a: any) => a.name),
                    album: t.al.name,
                    pic_id: t.al.picUrl,
                    url_id: String(t.id),
                    lyric_id: String(t.id),
                    source: '_netease'
              }));
              setPlaylistDetail(tracks);
          }
      } catch (e: any) {
          toast.error('Failed to load playlist detail');
      } finally {
          setDetailLoading(false);
      }
  };

  const handleImport = async () => {
      if (!currentPlaylist || playlistDetail.length === 0) return;
      
      setImporting(true);
      const toastId = toast.loading(`Importing 0/${playlistDetail.length}...`);
      
      try {
          const playlistId = createPlaylist(currentPlaylist.name + ' - Netease');
          
          await processBatch(
            playlistDetail,
            (track) => addToPlaylist(playlistId, track),
            (current, total) => {
                toast.loading(`Importing ${current}/${total}...`, { id: toastId });
            }
          );
          
          toast.success(`Imported playlist "${currentPlaylist.name}"`, { id: toastId });
      } catch (e: any) {
          toast.error('Import failed: ' + e.message, { id: toastId });
      } finally {
          setImporting(false);
      }
  };

  const handlePlay = (track: MusicTrack | null, index?: number) => {
      if (playlistDetail.length === 0) return;

      if (track && typeof index === 'number') {
          playContext(playlistDetail, index);
      } else {
          // Play all (start from first)
          playContext(playlistDetail, 0);
      }
  };

  const handleSearchPlay = (track: MusicTrack) => {
      if (searchResults.length > 0) {
          const index = searchResults.findIndex(t => t.id === track.id);
          playContext(searchResults, index >= 0 ? index : 0);
      }
  };

  const fetchSearch = async (nextPage: number, reset = false) => {
      if (!searchQuery.trim() || searchLoading) return;

      if (reset) {
          searchAbortRef.current?.abort();
          searchAbortRef.current = new AbortController();
          setSearchResults([]);
          setSearchPage(0);
      }

      setSearchLoading(true);
      try {
          const signal = searchAbortRef.current?.signal;
          const res = await musicApi.search(searchQuery, '_netease', nextPage, 20, signal);

          if (signal?.aborted) return;

          setSearchResults(prev => reset ? res.items : [...prev, ...res.items]);
          setSearchHasMore(res.hasMore);
          setSearchPage(nextPage);
      } catch (e: any) {
          if (e.name !== 'AbortError') {
              toast.error('搜索失败');
          }
      } finally {
          setSearchLoading(false);
      }
  };

  const renderPlaylistGrid = (list: any[], isLoading: boolean) => {
      if (isLoading && list.length === 0) {
           return (
             <div className="flex items-center justify-center h-40 text-muted-foreground">
                 <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...
             </div>
           );
      }
      if (list.length === 0) {
          return <div className="text-center text-muted-foreground p-8">No playlists found</div>;
      }
      return (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {list.map(p => (
                 <div key={p.id} 
                      className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handlePlaylistClick(p)}
                 >
                     <div className="flex gap-3 overflow-hidden w-full">
                         <MusicCover 
                            src={p.coverImgUrl || p.picUrl} 
                            className="w-12 h-12 rounded object-cover shrink-0" 
                            alt={p.name} 
                            iconClassName="h-6 w-6"
                         />
                         <div className="flex flex-col min-w-0 flex-1">
                             <span className="font-medium truncate">{p.name}</span>
                             <span className="text-xs text-muted-foreground">
                                {p.trackCount ? `${p.trackCount} tracks` : (p.copywriter || 'Playlist')}
                             </span>
                         </div>
                     </div>
                 </div>
             ))}
         </div>
      );
  };

  if (currentPlaylist) {
      return (
          <div className="flex flex-col h-full">
              <div className="flex items-center p-4 border-b">
                  <Button variant="ghost" onClick={() => {
                      setCurrentPlaylist(null);
                      setPlaylistDetail([]);
                  }}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back to Playlists
                  </Button>
              </div>
              
              {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : (
                  <MusicPlaylistView 
                    title={currentPlaylist.name}
                    description={currentPlaylist.creator ? `by ${currentPlaylist.creator.nickname}` : (currentPlaylist.copywriter || '')}
                    coverUrl={currentPlaylist.coverImgUrl || currentPlaylist.picUrl}
                    tracks={playlistDetail}
                    onPlay={handlePlay}
                    action={
                        <Button onClick={handleImport} disabled={importing}>
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4" />}
                            Import
                        </Button>
                    }
                  />
              )}
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">NetEase Cloud Music</h2>
            <p className="text-muted-foreground">Browse and import your playlists</p>
        </div>
        <div className="flex gap-2 items-center">
            <Button variant="ghost" size="icon" onClick={() => { loadPlaylists(); loadRecommend(); }} disabled={loading || recLoading}>
                <RefreshCw className={`h-4 w-4 ${(loading || recLoading) ? "animate-spin" : ""}`} />
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer border hover:opacity-80 transition-opacity">
                        <AvatarImage src={profile?.avatarUrl} alt={profile?.nickname} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium leading-none">{profile?.nickname || 'User'}</p>
                            </div>
                            <p className="text-xs leading-none text-muted-foreground truncate">
                                {profile?.signature || 'No signature'}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive cursor-pointer hover:bg-destructive/10" onClick={onLogout}>
                        <LogOut className="mr-2 h-4 w-4"/> 退出登录
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 min-h-0 border rounded-md">
        <Tabs defaultValue="created" className="h-full flex flex-col">
            <div className="px-4 pt-4 border-b">
                <TabsList>
                    <TabsTrigger value="created">Created</TabsTrigger>
                    <TabsTrigger value="subscribed">Subscribed</TabsTrigger>
                    <TabsTrigger value="recommended">Recommended</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
            </div>
            <div className="flex-1 min-h-0">
                <TabsContent value="search" className="m-0 h-full">
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchSearch(1, true)}
                                        placeholder="搜索歌曲 / 歌手 / 专辑"
                                        className="pl-9"
                                    />
                                </div>
                                <Button onClick={() => fetchSearch(1, true)} disabled={searchLoading}>
                                    {searchLoading ? <Loader2 className="animate-spin" /> : <Search />}
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <MusicTrackList
                                tracks={searchResults}
                                onPlay={handleSearchPlay}
                                loading={searchLoading}
                                hasMore={searchHasMore}
                                onLoadMore={() => fetchSearch(searchPage + 1)}
                                emptyMessage={searchLoading ? "搜索中..." : "输入关键词开始搜索"}
                            />
                        </div>
                    </div>
                </TabsContent>
                <ScrollArea className="h-full">
                    <div className="p-4">
                        <TabsContent value="created" className="m-0 mt-0">
                            {renderPlaylistGrid(createdPlaylists, loading)}
                        </TabsContent>
                        <TabsContent value="subscribed" className="m-0 mt-0">
                            {renderPlaylistGrid(subscribedPlaylists, loading)}
                        </TabsContent>
                        <TabsContent value="recommended" className="m-0 mt-0">
                            {renderPlaylistGrid(recommendPlaylists, recLoading)}
                        </TabsContent>
                    </div>
                </ScrollArea>
            </div>
        </Tabs>
      </div>
    </div>
  );
}
