"use client";

import { ImageIcon, Music, Video, FileText, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileDataStore } from "@/lib/file-store";
import { FileType } from "@shared/types";
import { STORAGE_KEYS, getFromStorage } from "@/lib/local-storage";
import { useEffect } from "react";

const fileTypes = [
  { id: FileType.Image, label: "Images", icon: ImageIcon },
  { id: FileType.Audio, label: "Audio", icon: Music },
  { id: FileType.Video, label: "Videos", icon: Video },
  { id: FileType.Document, label: "Documents", icon: FileText },
];

export function FileTypeTabs() {
  const activeType = useFileDataStore((s) => s.activeType);
  const setActiveType = useFileDataStore((s) => s.setActiveType);

  useEffect(() => {
    setActiveType(getFromStorage(STORAGE_KEYS.ACTIVE_TYPE, FileType.Image));
  }, [setActiveType]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {fileTypes.map((type) => {
        const Icon = type.icon;

        return (
          <Button
            key={type.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveType(type.id)}
            className={`
              transition-all duration-200
              ${
                activeType === type.id
                  ? "bg-primary/20 text-primary border border-primary/50"
                  : "text-foreground/80 hover:text-foreground hover:bg-secondary/50"
              }
            `}
          >
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            {type.label}
          </Button>
        );
      })}
    </div>
  );
}
