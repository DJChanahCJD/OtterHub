"use client";

import {
  Loader2,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "done" | "loading" | "error" | "idle";

interface Props {
  currentCount: number;
  hasMore: boolean;
  loading: boolean;
  error?: boolean;
  onLoadMore: () => void;
  className?: string;
}

export function LoadMoreButton({
  currentCount,
  hasMore,
  loading,
  error,
  onLoadMore,
  className,
}: Props) {
  const status: Status =
    loading ? "loading" :
    error ? "error" :
    !hasMore ? "done" :
    "idle";

  const wrapperCls = cn(
    "flex flex-col items-center gap-3 py-8",
    className,
  );

  if (status === "done") {
    return (
      <div className={wrapperCls}>
        <CheckCircle className="h-5 w-5 text-emerald-400" />
        <CountText count={currentCount} label="已加载全部" />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={wrapperCls}>
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        <CountText count={currentCount} label="正在加载..." />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={wrapperCls}>
        <AlertCircle className="h-5 w-5 text-red-400" />
        <Button
          variant="outline"
          onClick={onLoadMore}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          重试
        </Button>
      </div>
    );
  }

  // idle
  return (
    <div className={wrapperCls}>
      <CountText count={currentCount} label="已加载" />
      <Button
        onClick={onLoadMore}
        variant="outline"
        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
      >
        <ChevronDown className="h-4 w-4 mr-2" />
        加载更多
      </Button>
    </div>
  );
}

function CountText({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/60">
      <span>{label}</span>
      <span className="text-emerald-400">{count}</span>
      <span>个文件</span>
    </div>
  );
}
