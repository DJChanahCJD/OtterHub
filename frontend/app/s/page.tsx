'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { shareApi } from '@/lib/api/share';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileIcon, Loader2, Clock, AlertCircle, CalendarClock } from 'lucide-react';
import { formatFileSize, formatTime } from '@/lib/utils';

function ShareContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('k'); // use 'k' for key/token
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    const fetchMeta = async () => {
      try {
        const data = await shareApi.getMeta(token);
        setMeta(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load file info');
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();
  }, [token]);

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const downloadUrl = shareApi.getDownloadUrl(token);
      console.log("downloadUrl", downloadUrl);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = meta.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (meta.oneTime) {
         setError('This one-time link has been used.');
         setMeta(null);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Link Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 z-0" />
        
        <Card className="w-full max-w-md z-10 border-white/20 shadow-xl backdrop-blur-md bg-card/80">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <FileIcon className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl break-all">{meta.fileName}</CardTitle>
              <p className="text-sm text-muted-foreground">{formatFileSize(meta.fileSize)}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {meta.mimeType?.startsWith('image/') && token && !meta.oneTime && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted/50">
                <img 
                  src={shareApi.getDownloadUrl(token)} 
                  alt={meta.fileName}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            
            {meta.oneTime && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-sm text-orange-600 dark:text-orange-400">
                <Clock className="h-4 w-4" />
                <span>阅后即焚</span>
              </div>
            )}
            
            {meta.expiresAt && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-600 dark:text-blue-400">
                <CalendarClock className="h-4 w-4" />
                <span>将于 {formatTime(meta.expiresAt)} 过期</span>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button 
              className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-primary/25 transition-all" 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Download File
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-sm text-muted-foreground/50 z-10">
          Powered by OtterHub
        </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
