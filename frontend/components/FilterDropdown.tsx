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
import { useIsMobile } from "@/hooks/use-mobile";
import { FileTag } from "@/lib/types";

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
  
  const availableTags = Object.values(FileTag);
  const isMobile = useIsMobile();

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
    const start = range?.from ? new Date(range.from).setHours(0, 0, 0, 0) : undefined;
    const end = range?.to ? new Date(range.to).setHours(23, 59, 59, 999) : undefined;

    setFilterDateRange({
      start,
      end,
    });
  };

  const setQuickDate = (type: "7d" | "30d" | "month") => {
    const now = new Date();
    const end = new Date(now).setHours(23, 59, 59, 999);
    let start: number;

    switch (type) {
      case "7d":
        start = new Date(now.setDate(now.getDate() - 6)).setHours(0, 0, 0, 0);
        break;
      case "30d":
        start = new Date(now.setDate(now.getDate() - 29)).setHours(0, 0, 0, 0);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1).setHours(0, 0, 0, 0);
        break;
    }

    setFilterDateRange({ start, end });
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
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-popover border-glass-border shadow-xl text-foreground">
        {/* 已应用筛选区域 - 仅在有筛选时显示 */}
        {activeFiltersCount > 0 && (
          <div className="bg-secondary/30 p-4 border-b border-glass-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-foreground/70 uppercase tracking-wider">已应用筛选</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-[10px] text-foreground/50 hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3 mr-1" />
                清空全部
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* 收藏状态 */}
              {filterLiked && (
                <Badge 
                  className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors gap-1 pr-1"
                  onClick={() => setFilterLiked(false)}
                >
                  <Heart className="h-3 w-3 fill-current" />
                  <span>已收藏</span>
                  <X className="h-2.5 w-2.5 ml-0.5 cursor-pointer opacity-60 hover:opacity-100" />
                </Badge>
              )}
              
              {/* 标签 */}
              {filterTags.map(tag => (
                <Badge 
                  key={tag}
                  className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors gap-1 pr-1"
                  onClick={() => toggleTag(tag)}
                >
                  <Tag className="h-3 w-3" />
                  <span>{tag}</span>
                  <X className="h-2.5 w-2.5 ml-0.5 cursor-pointer opacity-60 hover:opacity-100" />
                </Badge>
              ))}

              {/* 日期范围 */}
              {(filterDateRange.start || filterDateRange.end) && (
                <Badge 
                  className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors gap-1 pr-1"
                  onClick={() => setFilterDateRange({})}
                >
                  <CalendarIcon className="h-3 w-3" />
                  <span className="text-[10px]">
                    {selectedRange?.from ? (
                      selectedRange.to ? (
                        <>{formatDate(selectedRange.from)} - {formatDate(selectedRange.to)}</>
                      ) : formatDate(selectedRange.from)
                    ) : "日期"}
                  </span>
                  <X className="h-2.5 w-2.5 ml-0.5 cursor-pointer opacity-60 hover:opacity-100" />
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
              {activeFiltersCount > 0 ? "修改筛选" : "添加筛选"}
            </h4>
          </div>

          {/* 收藏 */}
          <div className="space-y-2.5">
            <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 px-0.5">
              <Heart className="h-3 w-3" />
              <span>状态</span>
            </div>
            <Button
              variant={filterLiked ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterLiked(!filterLiked)}
              className={cn(
                "w-full justify-start gap-2 h-9 text-xs transition-all",
                filterLiked 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-transparent border-glass-border hover:border-primary/50"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", filterLiked && "fill-current")} />
              <span>只看收藏内容</span>
            </Button>
          </div>

          {/* 标签 */}
          {availableTags.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 px-0.5">
                <Tag className="h-3 w-3" />
                <span>热门标签</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-glass-border">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filterTags.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-2.5 py-1 text-[10px] transition-all",
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
          <div className="space-y-2.5">
            <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 px-0.5">
              <CalendarIcon className="h-3 w-3" />
              <span>上传时间</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] bg-transparent border-glass-border hover:border-primary/50"
                onClick={() => setQuickDate("7d")}
              >
                最近 7 天
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] bg-transparent border-glass-border hover:border-primary/50"
                onClick={() => setQuickDate("30d")}
              >
                最近 30 天
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] bg-transparent border-glass-border hover:border-primary/50"
                onClick={() => setQuickDate("month")}
              >
                本月
              </Button>
              
              {!isMobile && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 text-[11px] bg-transparent border-glass-border hover:border-primary/50",
                      )}
                    >
                      自定义范围
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="left">
                    <Calendar
                      autoFocus
                      mode="range"
                      defaultMonth={selectedRange?.from}
                      selected={selectedRange}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
