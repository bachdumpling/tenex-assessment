"use client"

import { FolderTree } from "@/components/folder/FolderTree"
import { IngestionProgress } from "@/components/folder/IngestionProgress"
import { useFolderTree } from "@/hooks/useFolderTree"

type FolderWorkspaceProps = {
  folderId: string
}

export function FolderWorkspace({ folderId }: FolderWorkspaceProps) {
  const {
    files,
    statusById,
    errorsById,
    loadError,
    phase,
    total,
    terminalCount,
  } = useFolderTree(folderId)

  return (
    <div className="flex flex-col gap-8">
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      <IngestionProgress done={terminalCount} total={total} />
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Files</h2>
        <FolderTree
          files={files}
          statusById={statusById}
          errorsById={errorsById}
        />
      </div>
      {phase === "listing" ? (
        <p className="text-xs text-muted-foreground">Loading file list…</p>
      ) : null}
      {phase === "ingesting" ? (
        <p className="text-xs text-muted-foreground">
          Indexing files (up to 3 at a time)…
        </p>
      ) : null}
    </div>
  )
}
