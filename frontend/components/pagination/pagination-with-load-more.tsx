"use client";

import ReactPaginate from "react-paginate";
import { ChevronLeft, ChevronRight, CircleAlert, Ellipsis, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  totalItems: number;
  itemsPerPage: number;
  hasMore: boolean;
  loading: boolean;
  error?: boolean;
  onPageChange: (selectedItem: { selected: number }) => void;
  onLoadMore: () => void;
  onItemsPerPageChange: (size: number) => void;
  className?: string;
}

const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100, 200, 1000];

export function PaginationWithLoadMore({
  totalItems,
  itemsPerPage,
  hasMore,
  loading,
  error,
  onPageChange,
  onLoadMore,
  onItemsPerPageChange,
  className,
}: Props) {
  const pageCount = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className={cn("flex items-center justify-center gap-6 py-8 flex-wrap", className)}>
      <ReactPaginate
        breakLabel="..."
        nextLabel={<ChevronRight className="h-4 w-4" />}
        onPageChange={onPageChange}
        pageRangeDisplayed={5}
        pageCount={pageCount}
        previousLabel={<ChevronLeft className="h-4 w-4" />}
        renderOnZeroPageCount={null}
        containerClassName="flex items-center gap-1"
        pageClassName="flex items-center justify-center"
        pageLinkClassName="min-w-[36px] h-9 flex items-center justify-center rounded-md text-sm text-white/80 hover:bg-white/10 transition-colors"
        previousClassName="flex items-center justify-center"
        previousLinkClassName="min-w-[36px] h-9 flex items-center justify-center rounded-md text-sm text-white/80 hover:bg-white/10 transition-colors px-3"
        nextClassName="flex items-center justify-center"
        nextLinkClassName="min-w-[36px] h-9 flex items-center justify-center rounded-md text-sm text-white/80 hover:bg-white/10 transition-colors px-3"
        breakClassName="flex items-center justify-center"
        breakLinkClassName="min-w-[36px] h-9 flex items-center justify-center text-white/40"
        activeClassName="bg-emerald-500/20 text-emerald-400 font-medium"
        disabledClassName="opacity-50 cursor-not-allowed"
        forcePage={undefined}
      />

      {hasMore && (
        <Button
          onClick={onLoadMore}
          disabled={loading || error}
          variant="ghost"
          size="sm"
          title={loading ? "加载中" : error ? "加载失败" : "加载更多"}
          className="h-9 min-w-[36px] px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : error ? (
            <CircleAlert className="h-4 w-4" />
          ) : (
            <Ellipsis className="h-4 w-4" />
          )}
        </Button>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-white/60">每页:</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
          <SelectTrigger className="h-8 w-20 bg-white/5 border-white/10 text-white/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-sm text-white/60">
        <span>共</span>
        <span className="text-emerald-400 font-medium">{totalItems}</span>
        <span>个文件</span>
      </div>
    </div>
  );
}
