"use client";

import * as React from "react";
import { Filter, Heart, Tag, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useAvailableTags, useFileQueryStore } from "@/lib/file-store";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

/**
 * 筛选下拉菜单组件
 * 支持收藏、标签、日期范围筛选
 */
export function FilterDropdown() {
  const {
    filterLiked,
    filterTags,
    filterDateRange,
    setFilterLiked,
    setFilterTags,
    setFilterDateRange,
    resetFilters
  } = useFileQueryStore();
  
  const availableTags = useAvailableTags();

  const activeFiltersCount = [
    filterLiked,
    filterTags.length > 0,
    filterDateRange.start || filterDateRange.end,
  ].filter(Boolean).length;

  const toggleTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter((t) => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

  const clearFilters = () => {
    resetFilters();
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setFilterDateRange({
      start: range?.from?.getTime(),
      end: range?.to?.getTime(),
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const selectedRange: DateRange | undefined = React.useMemo(() => {
    if (!filterDateRange.start && !filterDateRange.end) return undefined;
    return {
      from: filterDateRange.start ? new Date(filterDateRange.start) : undefined,
      to: filterDateRange.end ? new Date(filterDateRange.end) : undefined,
    };
  }, [filterDateRange]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 px-3 bg-glass-bg border-glass-border hover:bg-secondary/50 gap-2",
              activeFiltersCount > 0 && "border-primary/50 text-primary"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>筛选</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 min-w-[1.25rem] justify-center bg-primary/20 text-primary border-none">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4 bg-popover border-glass-border shadow-xl text-foreground">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">筛选器</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs text-foreground/50 hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                清空
              </Button>
            )}
          </div>

          {/* 收藏 */}
          <div className="space-y-2">
            <div className="text-xs text-foreground/50 flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>收藏</span>
            </div>
            <Button
              variant={filterLiked ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterLiked(!filterLiked)}
              className={cn(
                "w-full justify-start gap-2 h-8",
                filterLiked && "bg-primary/20 text-primary hover:bg-primary/30 border-primary/50"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", filterLiked && "fill-current")} />
              <span>只看收藏</span>
            </Button>
          </div>

          {/* 标签 */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-foreground/50 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>标签</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filterTags.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-2 py-0.5 text-[10px] transition-colors",
                      filterTags.includes(tag) 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-transparent text-foreground/60 border-glass-border hover:border-primary/50 hover:text-foreground"
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 日期范围 */}
          <div className="space-y-2">
            <div className="text-xs text-foreground/50 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>日期范围</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8 text-xs",
                    !selectedRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {selectedRange?.from ? (
                    selectedRange.to ? (
                      <>
                        {formatDate(selectedRange.from)} -{" "}
                        {formatDate(selectedRange.to)}
                      </>
                    ) : (
                      formatDate(selectedRange.from)
                    )
                  ) : (
                    <span>选择日期范围</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={selectedRange?.from}
                  selected={selectedRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
