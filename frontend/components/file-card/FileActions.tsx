import {
  MoreVertical,
  Download,
  Trash2,
  Copy,
  Heart,
  Eye,
  Edit,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileActionsProps {
  onDownload: () => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
  onToggleLike: () => void;
  onCopyLink: () => void;
  onShowDetail: () => void;
  isLiked: boolean;
}

export function FileActions({
  onDownload,
  onDelete,
  onView,
  onEdit,
  onToggleLike,
  onCopyLink,
  onShowDetail,
  isLiked,
}: FileActionsProps) {
  const IconColor = "text-foreground/80";
  return (
    <div className="flex items-center gap-1">
      {/* 收藏按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="text-foreground/80 hover:text-foreground bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLike();
        }}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            isLiked
              ? "text-pink-400 fill-pink-400"
              : "text-foreground/80 hover:text-pink-300"
          }`}
        />
      </Button>

      {/* 下拉菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-popover border-glass-border"
        >
          {/* 查看 */}
          <DropdownMenuItem
            onClick={onView}
            className="text-foreground hover:bg-secondary/50"
          >
            <Eye className={`h-4 w-4 mr-2 ${IconColor}`} />
            View
          </DropdownMenuItem>

          {/* 复制链接 */}
          <DropdownMenuItem
            onClick={onCopyLink}
            className="text-foreground hover:bg-secondary/50"
          >
            <Copy className={`h-4 w-4 mr-2 ${IconColor}`} />
            Copy Link
          </DropdownMenuItem>

          {/* 编辑 */}
          <DropdownMenuItem
            onClick={onEdit}
            className="text-foreground hover:bg-secondary/50"
          >
            <Edit className={`h-4 w-4 mr-2 ${IconColor}`} />
            Edit
          </DropdownMenuItem>

          {/* 下载 */}
          <DropdownMenuItem
            onClick={onDownload}
            className="text-foreground hover:bg-secondary/50"
          >
            <Download className={`h-4 w-4 mr-2 ${IconColor}`} />
            Download
          </DropdownMenuItem>

          {/* 详情 */}
          <DropdownMenuItem
            onClick={onShowDetail}
            className="text-foreground hover:bg-secondary/50"
          >
            <Info className={`h-4 w-4 mr-2 ${IconColor}`} />
            Details
          </DropdownMenuItem>

          {/* 删除 */}
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className={`h-4 w-4 mr-2 ${IconColor}`} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
