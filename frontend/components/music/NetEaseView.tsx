import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { neteaseApi } from '@/lib/api/music-import';
import { toast } from 'sonner';
import { useNetEaseStore } from '@/stores/netease-store';
import { useMusicStore } from '@/stores/music-store';
import { MusicTrack } from '@shared/types';
import { LogOut, RefreshCw, Loader2 } from 'lucide-react';

export function NetEaseView() {
  const { cookie, userId, setSession, clearSession } = useNetEaseStore();
  
  if (!cookie || !userId) {
    return <NetEaseLogin onLoginSuccess={setSession} />;
  }

  return <NetEaseImport cookie={cookie} userId={userId} onLogout={clearSession} />;
}

function NetEaseLogin({ onLoginSuccess }: { onLoginSuccess: (cookie: string, userId: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  
  const handleLogin = async () => {
    if (!cookieInput) return;
    setLoading(true);
    try {
        const profileRes = await neteaseApi.getMyInfo(cookieInput);
        if (profileRes.data.account) {
             toast.success('Login successful');
             onLoginSuccess(cookieInput, profileRes.data.account.id);
        } else {
             toast.error('Invalid cookie or session expired');
        }
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to NetEase Music</CardTitle>
          <CardDescription>Use your MUSIC_U cookie to login</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>MUSIC_U Cookie</Label>
               <Input 
                 value={cookieInput} 
                 onChange={(e) => setCookieInput(e.target.value)} 
                 placeholder="Paste your MUSIC_U cookie here..."
               />
               <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Open <a href="https://music.163.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">music.163.com</a> and login<br/>
                  2. Press F12 to open DevTools<br/>
                  3. Go to Application -&gt; Cookies<br/>
                  4. Copy the value of 'MUSIC_U' or the full cookie string
               </p>
             </div>
             <Button className="w-full" onClick={handleLogin} disabled={loading}>
               {loading ? <Loader2 className="animate-spin h-4 w-4"/> : 'Verify & Login'}
             </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NetEaseImport({ cookie, userId, onLogout }: { cookie: string, userId: string, onLogout: () => void }) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { createPlaylist, addToPlaylist } = useMusicStore();

  useEffect(() => {
    loadPlaylists();
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

  const handleImport = async () => {
    setImporting(true);
    try {
      let count = 0;
      for (const id of selectedIds) {
        const detail = await neteaseApi.getPlaylistDetail(id, cookie);
        if (detail.tracks) {
            const playlistId = createPlaylist(detail.name);
            
            detail.tracks.forEach((t: any) => {
                const track: MusicTrack = {
                    id: `ne_track_${t.id}`,
                    name: t.name,
                    artist: t.ar.map((a: any) => a.name),
                    album: t.al.name,
                    pic_id: t.al.picUrl,
                    url_id: String(t.id),
                    lyric_id: String(t.id),
                    source: 'netease'
                };
                addToPlaylist(playlistId, track);
            });
            count++;
        }
      }
      toast.success(`Imported ${count} playlists`);
      setSelectedIds([]);
    } catch (e: any) {
      toast.error('Import failed: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === playlists.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(playlists.map(p => String(p.id)));
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">NetEase Cloud Music</h2>
            <p className="text-muted-foreground">Import your playlists to OtterHub</p>
        </div>
        <Button variant="outline" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4"/> Logout
        </Button>
      </div>

      <div className="flex items-center gap-2">
         <Button onClick={handleImport} disabled={importing || selectedIds.length === 0}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Import Selected ({selectedIds.length})
         </Button>
         <Button variant="ghost" onClick={loadPlaylists} disabled={loading}>
             <RefreshCw className={loading ? "animate-spin" : ""} />
         </Button>
         <div className="flex-1" />
         <Button variant="secondary" size="sm" onClick={handleSelectAll}>
            {selectedIds.length === playlists.length ? 'Deselect All' : 'Select All'}
         </Button>
      </div>

      <ScrollArea className="flex-1 border rounded-md p-4">
         {loading ? (
             <div className="flex items-center justify-center h-40 text-muted-foreground">
                 <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading playlists...
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {playlists.map(p => (
                     <div key={p.id} 
                          className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedIds.includes(String(p.id)) ? 'bg-accent border-primary' : 'hover:bg-accent/50'}`}
                          onClick={() => toggleSelection(String(p.id))}
                     >
                         <Checkbox 
                             id={String(p.id)} 
                             checked={selectedIds.includes(String(p.id))}
                             onCheckedChange={() => toggleSelection(String(p.id))}
                             className="mt-1"
                         />
                         <div className="flex gap-3 overflow-hidden">
                             <img src={p.coverImgUrl} className="w-12 h-12 rounded object-cover shrink-0" alt={p.name} />
                             <div className="flex flex-col min-w-0">
                                 <span className="font-medium truncate">{p.name}</span>
                                 <span className="text-xs text-muted-foreground">{p.trackCount} tracks · by {p.creator?.nickname}</span>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
         )}
      </ScrollArea>
    </div>
  );
}
