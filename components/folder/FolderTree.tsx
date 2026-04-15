"use client"

import type { DriveFileListItem } from "@/types/drive"
import { FileCard } from "@/components/folder/FileCard"
import type { FileIngestStatus } from "@/hooks/useIngestion"

type FolderTreeProps = {
  files: DriveFileListItem[]
  statusById: Record<string, FileIngestStatus>
  errorsById: Record<string, string>
}

export function FolderTree({ files, statusById, errorsById }: FolderTreeProps) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No files in this folder (or still loading).
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
          />
        </li>
      ))}
    </ul>
  )
}
