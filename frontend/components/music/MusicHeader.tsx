import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MusicSource } from '@/lib/music-api';

interface MusicHeaderProps {
  onSearch: (query: string, source: MusicSource) => void;
  loading?: boolean;
}

const stableSources = {
  'netease': "网易云音乐",
  'kuwo': "酷我音乐",
  'joox': "Joox",
  'bilibili': "B站",
}

export function MusicHeader({ onSearch, loading }: MusicHeaderProps) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<MusicSource>('netease');

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch(query, source);
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex-1 w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索歌曲、歌手或专辑..."
          className="pl-9 h-10 text-base"
        />
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <Select value={source} onValueChange={(v) => setSource(v as MusicSource)}>
          <SelectTrigger className="w-[140px] h-10">
            <SelectValue placeholder="选择音源" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(stableSources).map(([key, value]) => (
              <SelectItem key={key} value={key}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} disabled={loading} className="h-10 px-6">
          {loading ? '搜索中...' : '搜索'}
        </Button>
      </div>
    </div>
  );
}
