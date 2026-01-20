// lib/hooks/use-init-file-store.ts
import { useEffect } from "react";
import { useFileQueryStore, useFileUIStore } from "@/lib/file-store";
import { getFromStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { ViewMode, SortType, SortOrder, ImageLoadMode } from "@/lib/types";

export function useInitFileStore() {
  useEffect(() => {
    // UI Store
    const ui = useFileUIStore.getState();
    ui.setViewMode(getFromStorage(STORAGE_KEYS.VIEW_MODE, ViewMode.Grid));
    ui.setSafeMode(getFromStorage(STORAGE_KEYS.SAFE_MODE, true));
    ui.setImageLoadMode(
      getFromStorage(STORAGE_KEYS.IMAGE_LOAD_MODE, ImageLoadMode.DataSaver)
    );
    ui.setItemsPerPage(getFromStorage(STORAGE_KEYS.ITEMS_PER_PAGE, 20));
    ui.setDataSaverThreshold(getFromStorage(STORAGE_KEYS.DATA_SAVER_THRESHOLD, 5.0));
    ui.setNsfwDetection(getFromStorage(STORAGE_KEYS.NSFW_DETECTION, true));

    // Query Store
    const query = useFileQueryStore.getState();
    query.setSortType(getFromStorage(STORAGE_KEYS.SORT_TYPE, SortType.UploadedAt));
    query.setSortOrder(getFromStorage(STORAGE_KEYS.SORT_ORDER, SortOrder.Desc));
  }, []);
}
