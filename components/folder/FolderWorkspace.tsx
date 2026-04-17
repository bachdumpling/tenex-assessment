"use client"

import { ChatPanel } from "@/components/chat/ChatPanel"
import { FolderTree } from "@/components/folder/FolderTree"
import { IngestionProgress } from "@/components/folder/IngestionProgress"
import { SegmentViewNode } from "@/components/folder/SegmentViewNode"
import { StaleIndexBanner } from "@/components/folder/StaleIndexBanner"
import { useFolderTree } from "@/hooks/useFolderTree"
import { formatIngestErrorForDisplay } from "@/lib/utils/ingest-errors"
import { touchRecentFolder } from "@/lib/utils/recent-folders"
import type { ChatMessage } from "@/types/chat"
import { useCallback, useEffect, useMemo, useState } from "react"

type FolderWorkspaceProps = {
  folderId: string
  userId: string | null | undefined
}

type FolderChatPayload = {
  sessionId?: string
  messages?: { id: string; role: string; content: string; citations: unknown }[]
  error?: string
}

export function FolderWorkspace({ folderId, userId }: FolderWorkspaceProps) {
  const {
    files,
    folderName,
    statusById,
    errorsById,
    skipReasonById,
    loadError,
    phase,
    total,
    terminalCount,
    refetch,
  } = useFolderTree(folderId)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initialList, setInitialList] = useState<Omit<
    ChatMessage,
    "isStreaming" | "streamError"
  >[] | null>(null)
  const [indexStale, setIndexStale] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      setSessionId(null)
      setInitialList(null)

      const markThreadUnavailable = () => {
        setSessionId(null)
        setInitialList([])
      }

      try {
        const res = await fetch(`/api/folder/${encodeURIComponent(folderId)}/chat`)
        const data = (await res.json()) as FolderChatPayload
        if (cancelled) return
        if (!res.ok) {
          markThreadUnavailable()
          return
        }
        const sid = data.sessionId ?? null
        const rows = (data.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            citations: m.citations as ChatMessage["citations"],
          }))
        setSessionId(sid)
        setInitialList(rows)
      } catch {
        if (!cancelled) markThreadUnavailable()
      }
    }
    void loadSession()
    return () => {
      cancelled = true
    }
  }, [folderId])

  useEffect(() => {
    if (phase !== "done") return
    let cancelled = false
    async function checkStale() {
      try {
        const res = await fetch(
          `/api/folder/${encodeURIComponent(folderId)}/index-status`
        )
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { stale?: boolean }
        if (!cancelled) setIndexStale(Boolean(data.stale))
      } catch {
        if (!cancelled) setIndexStale(false)
      }
    }
    void checkStale()
    return () => {
      cancelled = true
    }
  }, [phase, folderId])

  useEffect(() => {
    if (phase !== "done" || !folderId) return
    touchRecentFolder({
      userId,
      folderId,
      label: folderName?.trim() || "Drive folder",
    })
  }, [phase, folderId, folderName, userId])

  const starterQuestions = useMemo(() => {
    const defaults = [
      "Give me a summary of the folder",
      "What files are in this folder?",
      "What are the main themes across these documents?",
    ]
    const fromFiles = files
      .filter((f) => statusById[f.id] === "done")
      .slice(0, 3)
      .map((f) => `What does “${f.name}” cover?`)
    const out = [...defaults]
    for (const q of fromFiles) {
      if (out.length >= 6) break
      if (!out.includes(q)) out.push(q)
    }
    return out
  }, [files, statusById])

  const startNewChatSession = useCallback(async () => {
    const res = await fetch(`/api/folder/${encodeURIComponent(folderId)}/chat`, {
      method: "POST",
    })
    const data = (await res.json()) as {
      sessionId?: string
      error?: string
    }
    if (!res.ok) {
      throw new Error(data.error ?? `Failed to start new chat (${res.status})`)
    }
    const sid = data.sessionId
    if (!sid) {
      throw new Error("No sessionId returned.")
    }
    setSessionId(sid)
    setInitialList([])
  }, [folderId])

  const meta = (
    <div className="space-y-4">
      {indexStale ? (
        <StaleIndexBanner
          busy={phase === "listing" || phase === "ingesting"}
          onReindex={() => {
            void refetch()
          }}
        />
      ) : null}
      <div>
        <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          Folder
        </h1>
        <p className="mt-1 leading-snug text-muted-foreground">
          {folderName ?? "This folder"}
        </p>
      </div>
      {loadError ? (
        <p className="text-destructive">
          {formatIngestErrorForDisplay(loadError)}
        </p>
      ) : null}
      <IngestionProgress done={terminalCount} total={total} />
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

  const filesPanel = (
    <div className="flex min-h-0 flex-col gap-3">
      <h1 className="shrink-0 font-heading text-lg font-semibold tracking-tight text-foreground">
        Files
      </h1>
      <div className="min-h-0 flex-1">
        <FolderTree
          folderId={folderId}
          phase={phase}
          files={files}
          statusById={statusById}
          errorsById={errorsById}
          skipReasonById={skipReasonById}
        />
      </div>
    </div>
  )

  const chat = (
    <ChatPanel
      key={`${folderId}-${sessionId ?? "none"}`}
      folderId={folderId}
      sessionId={sessionId}
      initialRows={initialList}
      starterQuestions={starterQuestions}
      onStartNewChat={startNewChatSession}
    />
  )

  return <SegmentViewNode meta={meta} files={filesPanel} chat={chat} />
}
