"use client";

import * as React from "react";
import { Filter, Heart, Tag, Calendar as CalendarIcon, X, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useFileQueryStore } from "@/stores/file"
import { cn, TAG_CONFIG } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { FileTag } from "@shared/types";

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

  const activeFiltersCount = [
    filterLiked,
    filterTags.length > 0,
    filterDateRange.start || filterDateRange.end,
  ].filter(Boolean).length;

  const toggleTag = (tag: FileTag) => {
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

  const setQuickDate = (type: "today" | "7d" | "30d" | "month") => {
    // 如果点击已选中的选项，则取消筛选
    if (activeQuickDate === type) {
      setFilterDateRange({ start: undefined, end: undefined });
      return;
    }

    const now = new Date();
    const end = new Date(now).setHours(23, 59, 59, 999);
    let start: number;

    switch (type) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).setHours(0, 0, 0, 0);
        break;
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

  // 判断当前选中的快捷时间选项
  const getActiveQuickDate = (): "today" | "7d" | "30d" | "month" | "custom" | null => {
    if (!filterDateRange.start || !filterDateRange.end) return null;
    
    const now = new Date();
    const end = new Date(now).setHours(23, 59, 59, 999);
    const start = filterDateRange.start;
    
    // 今天的开始时间
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).setHours(0, 0, 0, 0);
    // 7天前的开始时间
    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 6)).setHours(0, 0, 0, 0);
    // 30天前的开始时间
    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 29)).setHours(0, 0, 0, 0);
    // 本月开始时间
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).setHours(0, 0, 0, 0);
    
    if (start === todayStart && filterDateRange.end === end) return "today";
    if (start === sevenDaysAgo && filterDateRange.end === end) return "7d";
    if (start === thirtyDaysAgo && filterDateRange.end === end) return "30d";
    if (start === monthStart && filterDateRange.end === end) return "month";
    return "custom";
  };

  const activeQuickDate = getActiveQuickDate();

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
              "h-9 px-3 text-foreground/80 hover:text-foreground hover:bg-secondary/50 gap-2",
              activeFiltersCount > 0 && "text-primary"
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">筛选</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 min-w-5 justify-center bg-primary/20 text-primary border-none">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-popover border-glass-border shadow-xl text-foreground">
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
              筛选
            </h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-[10px] text-foreground/50 hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3" />
                清除
              </Button>
            )}
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
                <span>标签</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const config = TAG_CONFIG[tag];
                  const isSelected = filterTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn(
                        "cursor-pointer px-2 py-1 text-[10px] transition-all duration-200 flex items-center gap-1",
                        isSelected
                          ? cn(
                              config?.bgColor || "bg-primary/20",
                              config?.textColor || "text-primary",
                              config?.borderColor || "border-primary/50",
                              "shadow-sm"
                            )
                          : "bg-transparent text-foreground/50 border-glass-border hover:border-foreground/30 hover:text-foreground/70"
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag === FileTag.NSFW && <AlertTriangle className="h-3 w-3" />}
                      {tag === FileTag.Private && <Lock className="h-3 w-3" />}
                      {config?.label || tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* 日期范围 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 px-0.5">
                <CalendarIcon className="h-3 w-3" />
                <span>上传时间</span>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-[10px]",
                      activeQuickDate === "custom"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-foreground/50 hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {selectedRange?.from
                      ? selectedRange.to
                        ? `${formatDate(selectedRange.from)} - ${formatDate(selectedRange.to)}`
                        : formatDate(selectedRange.from)
                      : "自定义范围"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
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
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeQuickDate === "today" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-[11px]",
                  activeQuickDate === "today"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent border-glass-border hover:border-primary/50"
                )}
                onClick={() => setQuickDate("today")}
              >
                今天
              </Button>
              <Button
                variant={activeQuickDate === "7d" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-[11px]",
                  activeQuickDate === "7d"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent border-glass-border hover:border-primary/50"
                )}
                onClick={() => setQuickDate("7d")}
              >
                最近 7 天
              </Button>
              <Button
                variant={activeQuickDate === "30d" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-[11px]",
                  activeQuickDate === "30d"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent border-glass-border hover:border-primary/50"
                )}
                onClick={() => setQuickDate("30d")}
              >
                最近 30 天
              </Button>
              <Button
                variant={activeQuickDate === "month" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-[11px]",
                  activeQuickDate === "month"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent border-glass-border hover:border-primary/50"
                )}
                onClick={() => setQuickDate("month")}
              >
                本月
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
