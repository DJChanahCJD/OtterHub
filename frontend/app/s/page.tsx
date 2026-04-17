'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { shareApi } from '@/lib/api/share';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileIcon, Loader2, Clock, AlertCircle, CalendarClock, Package, Archive, Image, Music, Video, FileText, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatFileSize, formatTime } from '@/lib/utils';
import { ShareMetaResponse, BundleFileInfo } from '@shared/types';

const FILE_TYPES = [
  { type: 'image', reg: /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|heic|heif)$/i },
  { type: 'video', reg: /\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)$/i },
  { type: 'audio', reg: /\.(mp3|wav|ogg|flac|aac|m4a|wma|ape|opus)$/i },
  { type: 'text', reg: /\.(txt|md|json|jsx?|tsx?|css|html|xml|ya?ml|csv|log|py|java|c|cpp|h|go|rs|sh|bat)$/i },
] as const;

const getFileCategory = (name: string) => FILE_TYPES.find(t => t.reg.test(name))?.type || 'other';

const FileIconByType = ({ category, className }: { category: string; className?: string }) => {
  const icons: Record<string, any> = { image: Image, video: Video, audio: Music, text: FileText };
  const Icon = icons[category] || FileIcon;
  return <Icon className={className} />;
};

const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
};

function ShareContent() {
  const token = useSearchParams().get('k');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ShareMetaResponse | null>(null);
  const [isActioning, setIsActioning] = useState(false); // 合并下载状态
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return setError('Invalid link'), setLoading(false);
    shareApi.getMeta(token)
      .then(setMeta)
      .catch(err => setError(err.message || 'Failed to load file info'))
      .finally(() => setLoading(false));
  }, [token]);

  const previewableFiles = useMemo(() => 
    (meta?.files || [])
      .map((f, i) => ({ ...f, originalIndex: i }))
      .filter(f => ['image', 'video', 'audio'].includes(getFileCategory(f.name))),
  [meta?.files]);

  const currentPreviewIndexInList = previewableFiles.findIndex(f => f.originalIndex === previewIndex);
  const currentPreviewFile = previewableFiles[currentPreviewIndexInList];

  const handlePreviewNav = (step: number) => {
    const nextIdx = currentPreviewIndexInList + step;
    if (nextIdx >= 0 && nextIdx < previewableFiles.length) setPreviewIndex(previewableFiles[nextIdx].originalIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === 'Escape') setPreviewIndex(null);
      if (e.key === 'ArrowLeft') handlePreviewNav(-1);
      if (e.key === 'ArrowRight') handlePreviewNav(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, currentPreviewIndexInList]);

  const executeDownload = async (action: () => string, filename: string) => {
    if (!token) return;
    setIsActioning(true);
    try {
      triggerDownload(action(), filename);
      if (meta?.oneTime) {
        setError('This one-time link has been used.');
        setMeta(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActioning(false);
    }
  };

  if (loading) return <FullScreenLoader />;
  if (error) return <ErrorCard error={error} />;

  const isBundle = meta?.type === 'bundle';

  return (
    <>
      {currentPreviewFile && token && (
        <PreviewModal 
          file={currentPreviewFile} 
          token={token} 
          total={previewableFiles.length}
          currentIndex={currentPreviewIndexInList}
          onClose={() => setPreviewIndex(null)}
          onNav={handlePreviewNav}
        />
      )}

      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 z-0" />
        
        <Card className={`z-10 border-white/20 shadow-xl backdrop-blur-md bg-card/80 w-full ${isBundle ? 'max-w-2xl' : 'max-w-md'}`}>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              {isBundle ? <Package className="h-10 w-10 text-primary" /> : <FileIcon className="h-10 w-10 text-primary" />}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl break-all">{isBundle ? '文件包' : meta?.fileName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isBundle ? `${meta?.files?.length || 0} 个文件` : formatFileSize(meta?.fileSize || 0)}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isBundle ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                {meta?.files?.map((file, i) => {
                  const cat = getFileCategory(file.name);
                  const isPrev = ['image', 'video', 'audio'].includes(cat);
                  const url = shareApi.getDownloadUrl(token!, file.key);

                  return (
                    <div key={file.key || i} className="group relative rounded-lg bg-secondary/30 border border-glass-border overflow-hidden hover:border-primary/50 transition-all" onClick={() => isPrev && setPreviewIndex(i)}>
                      <div className="aspect-square flex items-center justify-center bg-secondary/50">
                        {cat === 'image' && url ? <img src={url} alt={file.name} className="w-full h-full object-cover" loading="lazy" /> : <FileIconByType category={cat} className="h-12 w-12 text-primary/50" />}
                      </div>
                      <div className="p-2 truncate">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {isPrev && <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setPreviewIndex(i); }}><Eye className="h-4 w-4" /></Button>}
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); executeDownload(() => shareApi.getDownloadUrl(token!, file.key), file.name); }}><Download className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              meta?.mimeType?.startsWith('image/') && token && !meta.oneTime && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img src={shareApi.getDownloadUrl(token)} alt={meta.fileName} className="h-full w-full object-contain" />
                </div>
              )
            )}

            <StatusBadges meta={meta} />
          </CardContent>

          <CardFooter>
            <Button
              className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-primary/25 transition-all"
              disabled={isActioning}
              onClick={() => isBundle 
                ? executeDownload(() => shareApi.getDownloadAllUrl(token!), `share-${token!.slice(0, 8)}.zip`)
                : executeDownload(() => shareApi.getDownloadUrl(token!), meta?.fileName || 'download')
              }
            >
              {isActioning ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Downloading...</> 
               : isBundle ? <><Archive className="mr-2 h-5 w-5" />下载全部 (ZIP)</> 
               : <><Download className="mr-2 h-5 w-5" />Download File</>}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground/50 z-10">Powered by OtterHub</div>
      </div>
    </>
  );
}

// 抽取的小组件提升可读性
const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const ErrorCard = ({ error }: { error: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md border-destructive/50 bg-destructive/5 text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><AlertCircle className="h-6 w-6 text-destructive" /></div>
        <CardTitle className="text-destructive">Link Unavailable</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">{error}</CardContent>
    </Card>
  </div>
);

const StatusBadges = ({ meta }: { meta: ShareMetaResponse | null }) => (
  <div className="flex flex-col gap-2">
    {meta?.oneTime && <div className="flex items-center justify-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-sm text-orange-600"><Clock className="h-4 w-4" />阅后即焚</div>}
    {meta?.expiresAt && <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-600"><CalendarClock className="h-4 w-4" />将于 {formatTime(meta.expiresAt)} 过期</div>}
  </div>
);

const PreviewModal = ({ file, token, total, currentIndex, onClose, onNav }: any) => {
  const cat = getFileCategory(file.name);
  const url = shareApi.getDownloadUrl(token, file.key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"><X className="h-6 w-6 text-white" /></button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/50 text-white text-sm max-w-[80%] truncate">{file.name}</div>
      
      {total > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} disabled={currentIndex === 0} className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="h-8 w-8 text-white" /></button>
          <button onClick={(e) => { e.stopPropagation(); onNav(1); }} disabled={currentIndex === total - 1} className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="h-8 w-8 text-white" /></button>
        </>
      )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">{currentIndex + 1} / {total}</div>
      <div className="w-full h-full flex items-center justify-center p-16" onClick={e => e.stopPropagation()}>
        {cat === 'image' && <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />}
        {cat === 'video' && <video src={url} controls autoPlay className="max-w-full max-h-full" />}
        {cat === 'audio' && (
          <div className="flex flex-col items-center gap-6">
            <Music className="h-24 w-24 text-white/50" />
            <p className="text-white text-lg">{file.name}</p>
            <audio src={url} controls autoPlay className="w-80" />
          </div>
        )}
      </div>
    </div>
  );
};

export default function SharePage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <ShareContent />
    </Suspense>
  );
}