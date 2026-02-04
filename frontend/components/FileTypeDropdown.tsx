"use client";

import { ImageIcon, Music, Video, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileDataStore } from "@/stores/file";
import { FileType } from "@shared/types";

const fileTypes = [
  { id: FileType.Image, label: "Images", icon: ImageIcon },
  { id: FileType.Audio, label: "Audio", icon: Music },
  { id: FileType.Video, label: "Videos", icon: Video },
  { id: FileType.Document, label: "Documents", icon: FileText },
];

export function FileTypeDropdown() {
  const activeType = useFileDataStore((s) => s.activeType);
  const setActiveType = useFileDataStore((s) => s.setActiveType);

  const currentType = fileTypes.find((type) => type.id === activeType);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="
            gap-2
            text-foreground/80
            hover:text-foreground
            hover:bg-secondary/60
            data-[state=open]:bg-secondary/60
          "
        >
          {currentType?.icon && (
            <currentType.icon className="text-foreground/80 h-4 w-4" />
          )}
          {currentType?.label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="
          min-w-40
          rounded-lg
          border border-glass-border
          bg-glass-bg
          backdrop-blur-md
          shadow-lg
        "
      >
        {fileTypes.map((type) => {
          const Icon = type.icon;

          return (
            <DropdownMenuItem
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`
                flex items-center gap-2
                rounded-md
                px-2 py-1.5
                text-sm
                transition-colors

                ${
                  activeType === type.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/80"
                }

                hover:bg-secondary/60
                hover:text-foreground

                focus:bg-secondary/60
                focus:text-foreground
              `}
            >
              <Icon className="h-4 w-4 mr-2 text-foreground/60" />
              {type.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
