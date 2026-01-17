"use client";

import { 
  ArrowDownAZ, 
  ArrowDownUp, 
  ArrowDownWideNarrow, 
   ClockArrowDown,
   ArrowUp,
   ArrowDown,
   Check,
   ChevronDown
 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useFileQueryStore } from "@/lib/file-store";
import { SortType, SortOrder } from "@/lib/types";

const typeOptions = [
  { 
    value: SortType.UploadedAt, 
    label: "上传时间", 
    icon: ClockArrowDown,
  },
  { 
    value: SortType.Name, 
    label: "文件名称", 
    icon: ArrowDownAZ,
  },
  { 
    value: SortType.FileSize, 
    label: "文件大小", 
    icon: ArrowDownWideNarrow,
  },
];

const orderOptions = [
  {
    value: SortOrder.Desc,
    label: "降序",
    icon: ArrowDown,
  },
  {
    value: SortOrder.Asc,
    label: "升序",
    icon: ArrowUp,
  },
];

export function SortTypeDropdown() {
  const { sortType, sortOrder, setSortType, setSortOrder } = useFileQueryStore();

  const currentType = typeOptions.find(o => o.value === sortType);
  const OrderIcon = sortOrder === SortOrder.Asc ? ArrowUp : ArrowDown;
  const TypeIcon = currentType?.icon;

  const toggleOrder = () => {
    setSortOrder(sortOrder === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc);
  };

  return (
    <div className="flex items-center rounded-lg bg-glass-bg border border-glass-border overflow-hidden">
      {/* 切换排序顺序的按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleOrder}
        className="h-9 px-3 text-foreground/80 hover:text-foreground hover:bg-secondary/50 gap-2 rounded-none border-none focus-visible:ring-0"
      >
        {TypeIcon && <TypeIcon className="h-4 w-4" />}
        <span className="text-sm font-medium">{currentType?.label}</span>
        <OrderIcon className="h-4 w-4 text-foreground/60" />
      </Button>

      {/* 分隔线 */}
      <div className="w-[1px] h-4 bg-glass-border" />

      {/* 切换排序类型的下拉菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-1.5 text-foreground/50 hover:text-foreground hover:bg-secondary/50 rounded-none border-none focus-visible:ring-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-popover border-glass-border shadow-xl">
          <DropdownMenuLabel className="text-xs text-foreground/50">排序字段</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sortType} onValueChange={(v) => setSortType(v as SortType)}>
            {typeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="text-foreground focus:text-foreground cursor-pointer"
                >
                  <Icon className="h-4 w-4 mr-2 text-foreground/60" />
                  {option.label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
