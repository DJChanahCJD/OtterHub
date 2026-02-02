import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { shareApi } from '@/lib/api';
import { toast } from 'sonner';
import { Copy, Loader2, Link as LinkIcon } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileKey: string;
  fileName: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  fileKey,
  fileName,
}: ShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  
  // Form State
  const [expireIn, setExpireIn] = useState<string>('3600'); // Default 1 hour
  const [customDays, setCustomDays] = useState<string>('1');
  const [oneTime, setOneTime] = useState(false);

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      let seconds: number | undefined;
      if (expireIn === 'custom') {
        const days = parseInt(customDays);
        if (isNaN(days) || days < 1 || days > 365) {
          toast.error('Please enter a valid number of days (1-365)');
          setLoading(false);
          return;
        }
        seconds = days * 86400;
      } else {
        seconds = expireIn === '-1' ? undefined : parseInt(expireIn);
      }

      const data = await shareApi.create({
        fileKey,
        expireIn: seconds,
        oneTime,
      });

      const url = `${window.location.origin}/s?k=${data.token}`;
      setShareLink(url);
      toast.success('Share link created!');
    } catch (error) {
      toast.error('Failed to create share link');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard');
    }
  };

  const handleReset = () => {
    setShareLink(null);
    setExpireIn('3600');
    setCustomDays('1');
    setOneTime(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setTimeout(handleReset, 300); // Reset after close animation
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Create a temporary link to share <span className="font-medium text-foreground">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

        {!shareLink ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expire">Expiration</Label>
              <Select value={expireIn} onValueChange={setExpireIn}>
                <SelectTrigger id="expire">
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 Hour</SelectItem>
                  <SelectItem value="86400">1 Day</SelectItem>
                  <SelectItem value="604800">7 Days</SelectItem>
                  <SelectItem value="2592000">30 Days</SelectItem>
                  <SelectItem value="custom">Custom (Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {expireIn === 'custom' && (
              <div className="grid gap-2">
                <Label htmlFor="custom-days">Days (Max 365)</Label>
                <Input
                  id="custom-days"
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCustomDays('');
                      return;
                    }
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      if (num > 365) setCustomDays('365');
                      else if (num < 1) setCustomDays('1');
                      else setCustomDays(val);
                    }
                  }}
                  placeholder="Enter days"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="one-time" 
                checked={oneTime} 
                onCheckedChange={(c) => setOneTime(c === true)} 
              />
              <Label htmlFor="one-time" className="cursor-pointer">
                One-time download (burn after reading)
              </Label>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">Link</Label>
              <Input id="link" value={shareLink} readOnly />
            </div>
            <Button size="sm" className="px-3" onClick={handleCopy}>
              <span className="sr-only">Copy</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {!shareLink ? (
             <div className="flex w-full justify-end gap-2">
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLink} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Link
                </Button>
             </div>
          ) : (
             <div className="flex w-full justify-end gap-2">
                <Button variant="secondary" onClick={handleReset}>
                  Create Another
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  Done
                </Button>
             </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
