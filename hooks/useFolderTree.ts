"use client"

import { useIngestion } from "@/hooks/useIngestion"

/**
 * Thin alias for folder tree UI (same data as ingestion hook).
 */
export function useFolderTree(folderId: string | null) {
  return useIngestion(folderId)
}
