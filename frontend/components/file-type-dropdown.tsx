"use client";

import { ImageIcon, Music, Video, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileStore } from "@/lib/file-store";
import { FileType } from "@/lib/types";

const fileTypes = [
  { id: FileType.Image, label: "Images", icon: ImageIcon },
  { id: FileType.Audio, label: "Audio", icon: Music },
  { id: FileType.Video, label: "Videos", icon: Video },
  { id: FileType.Document, label: "Documents", icon: FileText },
];

export function FileTypeDropdown() {
  const activeType = useFileStore((s) => s.activeType);
  const setActiveType = useFileStore((s) => s.setActiveType);

  const currentType = fileTypes.find((type) => type.id === activeType);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 gap-2"
        >
          {currentType?.icon && <currentType.icon className="h-4 w-4" />}
          {currentType?.label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-[#0d2137] border-white/10">
        {fileTypes.map((type) => {
          const Icon = type.icon;

          return (
            <DropdownMenuItem
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`
                text-white
                hover:bg-white/10
                focus:bg-white/10
                ${
                  activeType === type.id
                    ? "bg-emerald-500/20 text-emerald-300"
                    : ""
                }
              `}
            >
              <Icon className="h-4 w-4 mr-2" />
              {type.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
