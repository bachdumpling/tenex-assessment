"use client"

import type { DriveFileListItem } from "@/types/drive"
import pLimit from "p-limit"
import { useCallback, useEffect, useState } from "react"

export type FileIngestStatus =
  | "pending"
  | "processing"
  | "done"
  | "failed"
  | "skipped"

type StatusMap = Record<string, FileIngestStatus>
type ErrorMap = Record<string, string>
type SkipReasonMap = Record<string, string>

const limit = pLimit(3)

export function useIngestion(folderId: string | null) {
  const [files, setFiles] = useState<DriveFileListItem[]>([])
  const [folderName, setFolderName] = useState<string | null>(null)
  const [statusById, setStatusById] = useState<StatusMap>({})
  const [errorsById, setErrorsById] = useState<ErrorMap>({})
  const [skipReasonById, setSkipReasonById] = useState<SkipReasonMap>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"idle" | "listing" | "ingesting" | "done">(
    "idle"
  )

  const run = useCallback(async () => {
    if (!folderId) return
    setPhase("listing")
    setLoadError(null)
    setErrorsById({})
    setSkipReasonById({})
    setFolderName(null)
    try {
      const res = await fetch(
        `/api/folder/${encodeURIComponent(folderId)}/files`
      )
      const body = (await res.json()) as {
        files?: DriveFileListItem[]
        folder?: { id: string; name: string }
        error?: string
      }
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to list folder files")
      }
      const list = body.files ?? []
      setFolderName(body.folder?.name?.trim() || null)
      setFiles(list)
      const initial: StatusMap = {}
      for (const f of list) initial[f.id] = "pending"
      setStatusById(initial)

      setPhase("ingesting")
      await Promise.all(
        list.map((f) =>
          limit(async () => {
            setStatusById((s) => ({ ...s, [f.id]: "processing" }))
            try {
              const ingestRes = await fetch(
                `/api/folder/${encodeURIComponent(folderId)}/ingest/${encodeURIComponent(f.id)}`,
                { method: "POST" }
              )
              const ingestBody = (await ingestRes.json()) as {
                ok?: boolean
                status?: string
                error?: string
                detail?: string
              }
              if (!ingestBody.ok) {
                setStatusById((s) => ({ ...s, [f.id]: "failed" }))
                if (ingestBody.error) {
                  setErrorsById((e) => ({ ...e, [f.id]: ingestBody.error! }))
                }
                return
              }
              const ui: FileIngestStatus =
                ingestBody.status === "skipped" ? "skipped" : "done"
              setStatusById((s) => ({ ...s, [f.id]: ui }))
              if (ui === "skipped") {
                const reason =
                  ingestBody.detail?.trim() ||
                  "This file type isn’t supported for indexing yet."
                setSkipReasonById((m) => ({ ...m, [f.id]: reason }))
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Ingest failed"
              setStatusById((s) => ({ ...s, [f.id]: "failed" }))
              setErrorsById((e) => ({ ...e, [f.id]: msg }))
            }
          })
        )
      )
      setPhase("done")
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ingestion failed")
      setSkipReasonById({})
      setPhase("idle")
    }
  }, [folderId])

  useEffect(() => {
    if (!folderId) {
      setFiles([])
      setFolderName(null)
      setStatusById({})
      setErrorsById({})
      setSkipReasonById({})
      setPhase("idle")
      return
    }
    void run()
  }, [folderId, run])

  const terminalCount = files.filter((f) => {
    const s = statusById[f.id]
    return s === "done" || s === "failed" || s === "skipped"
  }).length

  return {
    files,
    folderName,
    statusById,
    errorsById,
    skipReasonById,
    loadError,
    phase,
    total: files.length,
    terminalCount,
    refetch: run,
  }
}
