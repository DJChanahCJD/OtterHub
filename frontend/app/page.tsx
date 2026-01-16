"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileUploadZone } from "@/components/upload/FileUploadZone";
import { FileGallery } from "@/components/FileGallery";
import { BatchOperationsBar } from "@/components/batch-operations/BatchOperationsBar";
import { EmptyState } from "@/components/EmptyState";
import {
  useActiveItems,
  useActiveSelectedKeys,
  useFileStore,
} from "@/lib/file-store";
import { ViewMode } from "@/lib/types";

export default function OtterHubPage() {
  const activeItems = useActiveItems();
  const selectedKeys = useActiveSelectedKeys();

  const { fetchNextPage, viewMode } = useFileStore();

  const isListOrGrid = [ViewMode.Grid, ViewMode.List].includes(viewMode);

  const showBatchBar = selectedKeys.length > 0 && isListOrGrid;

  const isEmpty = activeItems.length === 0;

  useEffect(() => {
    fetchNextPage().catch((error) => {
      console.error("[OtterHubPage] fetch files failed:", error);
    });
  }, [fetchNextPage]);

  return (
    <div className="relative min-h-screen bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 p-6 md:p-8">
          <FileUploadZone />

          {isEmpty ? <EmptyState /> : <FileGallery />}
        </main>

        {showBatchBar && <BatchOperationsBar />}

        <Footer />
      </div>
    </div>
  );
}
