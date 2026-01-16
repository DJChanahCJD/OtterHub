"use client";

import { ArrowDownAZ, ArrowDownUp, ArrowDownWideNarrow, ClockArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileStore } from "@/lib/file-store";
import { SortType, SortOrder } from "@/lib/types";

const sortOptions = [
  { 
    id: "time-desc", 
    label: "按时间降序", 
    sortType: SortType.UploadedAt, 
    sortOrder: SortOrder.Desc,
    icon: ClockArrowDown,
  },
  { 
    id: "name-asc", 
    label: "按名称升序", 
    sortType: SortType.Name, 
    sortOrder: SortOrder.Asc,
    icon: ArrowDownAZ,
  },
  { 
    id: "size-desc", 
    label: "按大小降序", 
    sortType: SortType.FileSize, 
    sortOrder: SortOrder.Desc,
    icon: ArrowDownWideNarrow,
  },
];

export function SortTypeDropdown() {
  const sortType = useFileStore((s) => s.sortType);
  const sortOrder = useFileStore((s) => s.sortOrder);
  const setSortType = useFileStore((s) => s.setSortType);
  const setSortOrder = useFileStore((s) => s.setSortOrder);

  const currentOption = sortOptions.find(
    (option) => option.sortType === sortType && option.sortOrder === sortOrder
  );
  const CurrentIcon = currentOption?.icon;

  const handleSortChange = (option: typeof sortOptions[0]) => {
    setSortType(option.sortType);
    setSortOrder(option.sortOrder);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center p-1 rounded-lg bg-glass-bg border border-glass-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground/80 hover:text-foreground hover:bg-secondary/50 gap-2"
          >
            {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
            <span>{currentOption?.label || "排序"}</span>
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-popover border-glass-border">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleSortChange(option)}
              className={`
                text-foreground
                hover:text-foreground/80
                focus:text-foreground/80
                ${
                  currentOption?.id === option.id
                    ? "bg-primary/20 text-primary"
                    : ""
                }
              `}
            >
              <Icon className="h-4 w-4 mr-2 text-foreground/80" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
