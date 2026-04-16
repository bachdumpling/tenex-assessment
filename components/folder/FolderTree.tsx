"use client"

import { FileCard } from "@/components/folder/FileCard"
import type { FileIngestStatus } from "@/hooks/useIngestion"
import type { DriveFileListItem } from "@/types/drive"

type FolderTreeProps = {
  folderId: string
  phase: "idle" | "listing" | "ingesting" | "done"
  files: DriveFileListItem[]
  statusById: Record<string, FileIngestStatus>
  errorsById: Record<string, string>
  skipReasonById: Record<string, string>
}

const DRIVE_FOLDER_BASE = "https://drive.google.com/drive/folders/"

export function FolderTree({
  folderId,
  phase,
  files,
  statusById,
  errorsById,
  skipReasonById,
}: FolderTreeProps) {
  if (files.length === 0) {
    if (phase === "listing" || phase === "ingesting") {
      return (
        <p className="text-muted-foreground">Loading files…</p>
      )
    }
    if (phase === "done") {
      return (
        <div className="space-y-2 text-muted-foreground">
          <p>No files in this folder.</p>
          <p>
            <a
              href={`${DRIVE_FOLDER_BASE}${encodeURIComponent(folderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Open in Google Drive
            </a>
          </p>
        </div>
      )
    }
    return (
      <p className="text-muted-foreground">
        Paste a folder link on the home page, or try again.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {files.map((file: DriveFileListItem) => (
        <li key={file.id}>
          <FileCard
            file={file}
            status={statusById[file.id]}
            error={errorsById[file.id]}
            skipReason={skipReasonById[file.id]}
          />
        </li>
      ))}
    </ul>
  )
}
