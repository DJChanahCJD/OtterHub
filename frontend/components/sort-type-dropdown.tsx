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
        <div className="flex items-center p-1 rounded-lg bg-white/5 border border-white/10">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10 gap-2"
          >
            {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
            <span>{currentOption?.label || "排序"}</span>
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-[#0d2137] border-white/10">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleSortChange(option)}
              className={`
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
              <Icon className="h-4 w-4 mr-2" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
