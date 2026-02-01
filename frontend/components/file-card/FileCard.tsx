"use client";

import { FileItem, FileType } from "@shared/types";
import { FileCardList } from "./FileCardList";
import { FileCardGrid } from "./FileCardGrid";
import { useFileCardActions } from "./hooks";

interface FileCardProps {
  file: FileItem;
  activeType?: FileType;
  listView?: boolean;
  masonryView?: boolean;
}

export function FileCard({ file, listView = false }: FileCardProps) {
  const actions = useFileCardActions(file);
  const { isIncompleteUpload, inputRef, handleResumeFileSelect } = actions;

  return (
    <>
      {listView ? (
        <FileCardList file={file} actions={actions} />
      ) : (
        <FileCardGrid file={file} actions={actions} />
      )}

      {/* 隐藏的文件输入框，用于继续上传 */}
      {isIncompleteUpload && (
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleResumeFileSelect}
        />
      )}
    </>
  );
}
