import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { shareApi } from "@/lib/api";
import { ShareItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/utils";

export function ShareTab() {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string[]>([]);

  /** ========== data ========== */
  const refresh = async () => {
    try {
      setLoading(true);
      setShares(await shareApi.list());
    } catch {
      toast.error("获取分享失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  /** ========== actions ========== */
  const revoke = async (token: string) => {
    setRevoking(v => [...v, token]);
    try {
      await shareApi.revoke(token);
      setShares(v => v.filter(s => s.token !== token));
      toast.success("已撤销");
    } catch {
      toast.error("撤销失败");
    } finally {
      setRevoking(v => v.filter(t => t !== token));
    }
  };

  const copy = (token: string) => {
    navigator.clipboard.writeText(`${location.origin}/s?k=${token}`);
    toast.success("链接已复制");
  };

  /** ========== render ========== */
  const renderRows = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </TableCell>
        </TableRow>
      );
    }

    if (!shares.length) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
            暂无活跃分享
          </TableCell>
        </TableRow>
      );
    }

    return shares.map(s => {
      const expired = s.expiresAt && s.expiresAt < Date.now();
      const isRevoking = revoking.includes(s.token);

      return (
        <TableRow key={s.token}>
          <TableCell>
            <div className="flex flex-col">
              <span className="truncate max-w-[200px]" title={s.fileName}>
                {s.fileName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(s.fileSize)}
              </span>
            </div>
          </TableCell>

          <TableCell>
            <Badge variant={s.oneTime ? "secondary" : "outline"}>
              {s.oneTime ? "阅后即焚" : "普通分享"}
            </Badge>
          </TableCell>

          <TableCell className="text-muted-foreground">
            {format(s.createdAt, "yyyy-MM-dd HH:mm")}
          </TableCell>

          <TableCell className={expired ? "text-destructive" : "text-muted-foreground"}>
            {s.expiresAt ? format(s.expiresAt, "yyyy-MM-dd HH:mm") : "永久有效"}
          </TableCell>

          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button size="icon" variant="ghost" onClick={() => copy(s.token)}>
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                disabled={isRevoking}
                onClick={() => revoke(s.token)}
                className="text-destructive"
              >
                {isRevoking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between">
        <div>
          <h2 className="text-lg font-medium">分享链接管理</h2>
          <p className="text-sm text-muted-foreground">
            管理并撤销分享链接
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading && "animate-spin"}`} />
          刷新
        </Button>
      </div>

      <div className="flex-1 overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>创建</TableHead>
              <TableHead>过期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderRows()}</TableBody>
        </Table>
      </div>
    </div>
  );
}
