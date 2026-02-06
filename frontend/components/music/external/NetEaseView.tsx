import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { neteaseApi } from '@/lib/api/music-import';
import { processBatch } from '@/lib/utils';
import { toast } from 'sonner';
import { useNetEaseStore } from '@/stores/netease-store';
import { useMusicStore } from '@/stores/music-store';
import { MusicTrack } from '@shared/types';
import { LogOut, RefreshCw, Loader2, ChevronLeft, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MusicPlaylistView } from '@/components/music/MusicPlaylistView';

export function NetEaseView() {
  const { cookie, userId, setSession, clearSession } = useNetEaseStore();
  
  if (!cookie || !userId) {
    return <NetEaseLogin onLoginSuccess={setSession} />;
  }

  return <NetEaseBrowser cookie={cookie} userId={userId} onLogout={clearSession} />;
}

function NetEaseLogin({ onLoginSuccess }: { onLoginSuccess: (cookie: string, userId: string) => void }) {
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
          if (profileRes.data.account) {
               toast.success('Login successful');
               onLoginSuccess(cookie, profileRes.data.account.id);
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
  const { playlists, setPlaylists } = useNetEaseStore();
  const [loading, setLoading] = useState(false);
  
  const [currentPlaylist, setCurrentPlaylist] = useState<any | null>(null);
  const [playlistDetail, setPlaylistDetail] = useState<MusicTrack[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const { createPlaylist, addToPlaylist, playContext } = useMusicStore();

  useEffect(() => {
    if (playlists.length === 0) {
      loadPlaylists();
    }
  }, [cookie, userId]);

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

  const handlePlaylistClick = async (playlist: any) => {
      setCurrentPlaylist(playlist);
      setDetailLoading(true);
      try {
          const detail = await neteaseApi.getPlaylistDetail(playlist.id, cookie);
          if (detail.tracks) {
              const tracks: MusicTrack[] = detail.tracks.map((t: any) => ({
                    id: `ne_track_${t.id}`,
                    name: t.name,
                    artist: t.ar.map((a: any) => a.name),
                    album: t.al.name,
                    pic_id: t.al.picUrl,
                    url_id: String(t.id),
                    lyric_id: String(t.id),
                    source: 'netease'
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
                    description={`by ${currentPlaylist.creator?.nickname}`}
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
        <div className="flex gap-2">
            <Button variant="ghost" onClick={loadPlaylists} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
            <Button variant="outline" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4"/> Logout
            </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border rounded-md">
        <ScrollArea className="h-full p-4">
         {loading ? (
             <div className="flex items-center justify-center h-40 text-muted-foreground">
                 <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading playlists...
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {playlists.map(p => (
                     <div key={p.id} 
                          className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handlePlaylistClick(p)}
                     >
                         <div className="flex gap-3 overflow-hidden w-full">
                             <img src={p.coverImgUrl} className="w-12 h-12 rounded object-cover shrink-0" alt={p.name} />
                             <div className="flex flex-col min-w-0 flex-1">
                                 <span className="font-medium truncate">{p.name}</span>
                                 <span className="text-xs text-muted-foreground">{p.trackCount} tracks</span>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
         )}
        </ScrollArea>
      </div>
    </div>
  );
}
