"use client";

import { useState, useEffect } from "react";
import { Key, Save, ExternalLink, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WallpaperProvider } from "./types";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: WallpaperProvider;
  currentApiKey: string;
  onSave: (newKey: string) => void;
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  source,
  currentApiKey,
  onSave,
}: ApiKeyDialogProps) {
  const [key, setKey] = useState(currentApiKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(currentApiKey);
      setShowKey(false);
    }
  }, [open, currentApiKey]);

  const handleSave = () => {
    onSave(key);
    onOpenChange(false);
  };

  const getHelpUrl = () => {
    if (source.id === 'pixabay') return "https://pixabay.com/api/docs/";
    if (source.id === 'wallhaven') return "https://wallhaven.cc/settings/account";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{source.name}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-xs font-bold uppercase opacity-60">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={`输入您的 ${source.name} API Key`}
                className="pr-10 bg-muted/30 border-border/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 h-4 w-4 opacity-40 hover:opacity-80 transition-opacity"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {getHelpUrl() && (
            <a
              href={getHelpUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1 w-fit"
            >
              获取 API Key <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            取消
          </Button>
          <Button onClick={handleSave} className="gap-2 text-xs">
            <Save className="h-3.5 w-3.5" />
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
