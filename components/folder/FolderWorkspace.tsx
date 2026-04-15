"use client"

import { ChatPanel } from "@/components/chat/ChatPanel"
import { FolderTree } from "@/components/folder/FolderTree"
import { IngestionProgress } from "@/components/folder/IngestionProgress"
import { SegmentViewNode } from "@/components/folder/SegmentViewNode"
import { useFolderTree } from "@/hooks/useFolderTree"
import type { ChatMessage } from "@/types/chat"
import { useEffect, useMemo, useRef, useState } from "react"

type FolderWorkspaceProps = {
  folderId: string
}

type FolderChatPayload = {
  sessionId?: string
  messages?: { id: string; role: string; content: string; citations: unknown }[]
  error?: string
}

export function FolderWorkspace({ folderId }: FolderWorkspaceProps) {
  const {
    files,
    statusById,
    errorsById,
    skipReasonById,
    loadError,
    phase,
    total,
    terminalCount,
  } = useFolderTree(folderId)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initialList, setInitialList] = useState<Omit<
    ChatMessage,
    "isStreaming" | "streamError"
  >[] | null>(null)
  const [serverThreadEmpty, setServerThreadEmpty] = useState<boolean | null>(null)
  const [bootstrapSummary, setBootstrapSummary] = useState<string | null>(null)
  const summaryRequested = useRef(false)

  useEffect(() => {
    let cancelled = false
    summaryRequested.current = false
    setBootstrapSummary(null)
    async function loadSession() {
      setSessionId(null)
      setInitialList(null)
      setServerThreadEmpty(null)

      const markThreadUnavailable = () => {
        setSessionId(null)
        setInitialList([])
        setServerThreadEmpty(true)
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
        setServerThreadEmpty(rows.length === 0)
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
    if (phase !== "done" || serverThreadEmpty !== true) return
    if (summaryRequested.current) return
    summaryRequested.current = true
    let cancelled = false
    async function run() {
      try {
        const res = await fetch(
          `/api/folder/${encodeURIComponent(folderId)}/summary`,
          { method: "POST" }
        )
        const data = (await res.json()) as { summary?: string; error?: string }
        if (cancelled) return
        if (res.ok && data.summary?.trim()) {
          setBootstrapSummary(data.summary.trim())
        }
      } catch {
        /* ignore */
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [phase, serverThreadEmpty, folderId])

  const starterQuestions = useMemo(() => {
    return files
      .filter((f) => statusById[f.id] === "done")
      .slice(0, 3)
      .map((f) => `What does “${f.name}” cover?`)
  }, [files, statusById])

  const meta = (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Folder</h1>
        <p className="mt-1 font-mono text-[11px] leading-snug text-muted-foreground break-all">
          {folderId}
        </p>
      </div>
      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
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
      <h1 className="shrink-0 text-sm font-medium text-foreground">Files</h1>
      <div className="min-h-0 flex-1">
        <FolderTree
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
      key={folderId}
      folderId={folderId}
      sessionId={sessionId}
      initialRows={initialList}
      starterQuestions={starterQuestions}
      bootstrapSummary={bootstrapSummary}
    />
  )

  return <SegmentViewNode meta={meta} files={filesPanel} chat={chat} />
}
