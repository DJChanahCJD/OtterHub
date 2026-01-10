"use client";

import { Image, ImageOff, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileStore } from "@/lib/file-store";
import { BrowseMode } from "@/lib/types";

const browseModeOptions = [
  {
    id: BrowseMode.Default,
    label: "默认模式",
    description: "正常显示所有内容",
    icon: Image,
  },
  {
    id: BrowseMode.SmartNoImage,
    label: "智能无图",
    description: "不加载大于5MB的图片",
    icon: ZapOff,
  },
  {
    id: BrowseMode.DataSaver,
    label: "省流模式",
    description: "不加载任何图片",
    icon: ImageOff,
  },
];

export function BrowseModeToggle() {
  const browseMode = useFileStore((s) => s.browseMode);
  const setBrowseMode = useFileStore((s) => s.setBrowseMode);

  const currentOption = browseModeOptions.find(
    (option) => option.id === browseMode
  );
  const CurrentIcon = currentOption?.icon;

  const handleModeChange = (mode: BrowseMode) => {
    setBrowseMode(mode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`
            h-9 w-9
            ${
              browseMode !== BrowseMode.Default
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }
          `}
        >
          {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0d2137] border-white/10 w-48">
        {browseModeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleModeChange(option.id)}
              className={`
                flex flex-col items-start py-3
                text-white
                hover:bg-white/10
                focus:bg-white/10
                ${
                  currentOption?.id === option.id
                    ? "bg-emerald-500/20 text-emerald-300"
                    : ""
                }
              `}
            >
              <div className="flex items-center w-full">
                <Icon className="h-4 w-4 mr-2 shrink-0" />
                <span className="font-medium">{option.label}</span>
              </div>
              <span className="text-xs text-white/60 ml-6">
                {option.description}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
