// lib/hooks/use-init-file-store.ts
import { useEffect } from "react";
import { useFileStore } from "@/lib/file-store";
import { getFromStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { ViewMode, SortType, SortOrder, ImageLoadMode } from "@/lib/types";

export function useInitFileStore() {
  const {
    setViewMode,
    setSortType,
    setSortOrder,
    setSafeMode,
    setImageLoadMode,
  } = useFileStore.getState(); // ⚠️ 注意：不是 hook 形式

  useEffect(() => {
    setViewMode(getFromStorage(STORAGE_KEYS.VIEW_MODE, ViewMode.Grid));
    setSortType(getFromStorage(STORAGE_KEYS.SORT_TYPE, SortType.UploadedAt));
    setSortOrder(getFromStorage(STORAGE_KEYS.SORT_ORDER, SortOrder.Desc));
    setSafeMode(getFromStorage(STORAGE_KEYS.SAFE_MODE, true));
    setImageLoadMode(
      getFromStorage(STORAGE_KEYS.IMAGE_LOAD_MODE, ImageLoadMode.DataSaver)
    );
  }, []);
}
