import { useEffect, useState } from "react";
import { shareApi } from "@/lib/api";
import { ShareItem } from "@shared/types";
import { format } from "date-fns";
import { Loader2, Trash2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const result = await shareApi.list();
      setShares(result);
    } catch (error) {
      toast.error("Failed to fetch shares");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    try {
      const success = await shareApi.revoke(token);
      if (success) {
        setShares((prev) => prev.filter((s) => s.token !== token));
        toast.success("Link revoked");
      } else {
        toast.error("Failed to revoke link");
      }
    } catch (error) {
      toast.error("Error revoking link");
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/s?k=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">分享链接管理</h2>
          <p className="text-sm text-muted-foreground">
            管理所有已创建的分享链接，可以撤销或复制链接。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchShares} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="rounded-md border flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件信息</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={5} className="h-24 text-center">
                   <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                 </TableCell>
               </TableRow>
            ) : shares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  暂无活跃的分享链接
                </TableCell>
              </TableRow>
            ) : (
              shares.map((share) => (
                <TableRow key={share.token}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[200px] text-sm" title={share.fileName}>{share.fileName}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(share.fileSize)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {share.oneTime ? (
                      <Badge variant="secondary" className="text-orange-500 bg-orange-500/10 hover:bg-orange-500/20">阅后即焚</Badge>
                    ) : (
                      <Badge variant="outline">普通分享</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(share.createdAt, 'MM-dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {share.expiresAt ? (
                        <span className={share.expiresAt < Date.now() ? "text-destructive" : ""}>
                            {format(share.expiresAt, 'MM-dd HH:mm')}
                        </span>
                    ) : (
                        <span>永久有效</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(share.token)} title="复制链接">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRevoke(share.token)}
                        disabled={revoking === share.token}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="撤销分享"
                      >
                        {revoking === share.token ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
