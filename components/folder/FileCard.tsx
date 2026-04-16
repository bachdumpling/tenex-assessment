"use client"

import { formatIngestErrorForDisplay } from "@/lib/utils/ingest-errors"
import {
  displaySkipReasonForFile,
  getMimeTypeLabel,
} from "@/lib/utils/mime-types"
import type { DriveFileListItem } from "@/types/drive"
import type { FileIngestStatus } from "@/hooks/useIngestion"

function statusDotClass(status: FileIngestStatus | undefined): string {
  switch (status) {
    case "processing":
      return "bg-primary"
    case "done":
      return "bg-chart-2"
    case "failed":
      return "bg-destructive"
    case "skipped":
      return "bg-muted-foreground/60"
    case "pending":
    default:
      return "bg-muted"
  }
}

type FileCardProps = {
  file: DriveFileListItem
  status: FileIngestStatus | undefined
  error?: string
  /** Shown after ingest when status is `skipped` (from API `detail`). */
  skipReason?: string
}

export function FileCard({ file, status, error, skipReason }: FileCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2">
      <span
        className={`mt-1.5 size-2 shrink-0 rounded-full ${statusDotClass(status)}`}
        title={status ?? "unknown"}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-card-foreground">{file.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {getMimeTypeLabel(file.mimeType)}
        </p>
        {status === "skipped" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Not indexed:{" "}
            {displaySkipReasonForFile(skipReason, file.mimeType)}
          </p>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-destructive">
            {formatIngestErrorForDisplay(error)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
