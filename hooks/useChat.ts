"use client"

import type { ChatApiMessage, StreamEvent } from "@/types/agent"
import type { ChatMessage, ReasoningItem } from "@/types/chat"
import { useCallback, useEffect, useRef, useState } from "react"

function parseNdjsonLines(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = []
  const parts = buffer.split("\n")
  const rest = parts.pop() ?? ""
  for (const line of parts) {
    const t = line.trim()
    if (!t) continue
    try {
      events.push(JSON.parse(t) as StreamEvent)
    } catch {
      /* skip */
    }
  }
  return { events, rest }
}

/**
 * When the API streams `"...document."` then `"There's..."` without a space,
 * concatenation looks broken. Insert a space after sentence-ending punctuation
 * before a capital letter (or common continuation like "(").
 */
function joinStreamingChunk(buffer: string, delta: string): string {
  if (!buffer) return delta
  const trimmedEnd = buffer.trimEnd()
  if (!trimmedEnd) return buffer + delta
  const lastChar = trimmedEnd.slice(-1)
  if (!/[.!?]/.test(lastChar)) return buffer + delta
  if (buffer.endsWith(" ")) return buffer + delta
  if (/^[\s.,;:'"([{<`]/.test(delta)) return buffer + delta
  if (/^[a-z]/.test(delta)) return buffer + delta
  if (/^[0-9]/.test(delta)) return buffer + delta
  return `${buffer} ${delta}`
}

export function useChat(folderId: string, sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages

  useEffect(() => {
    setMessages([])
    setError(null)
  }, [folderId])

  const hydrate = useCallback((rows: Omit<ChatMessage, "isStreaming" | "streamError">[]) => {
    setMessages(
      rows.map((r) => ({
        ...r,
        citations: r.citations ?? null,
      }))
    )
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      }
      const assistantId = crypto.randomUUID()

      const priorForApi: ChatApiMessage[] = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const apiPayload: ChatApiMessage[] = [
        ...priorForApi,
        { role: "user", content: trimmed },
      ]

      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          reasoning: [],
          isStreaming: true,
          streamError: null,
        },
      ])
      setLoading(true)
      setError(null)

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      const patchAssistant = (update: (m: ChatMessage) => ChatMessage) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? update(m) : m))
        )
      }

      const applyEvents = (events: StreamEvent[]) => {
        for (const ev of events) {
          switch (ev.type) {
            case "tool_call":
            case "tool_result": {
              const item: ReasoningItem =
                ev.type === "tool_call"
                  ? {
                      kind: "tool_call",
                      toolName: ev.toolName,
                      toolCallId: ev.toolCallId,
                      input: ev.input,
                    }
                  : {
                      kind: "tool_result",
                      toolCallId: ev.toolCallId,
                      output: ev.output,
                    }
              patchAssistant((m) => ({
                ...m,
                reasoning: [...(m.reasoning ?? []), item],
              }))
              break
            }
            case "text":
              patchAssistant((m) => ({
                ...m,
                content: joinStreamingChunk(m.content, ev.delta),
              }))
              break
            case "done":
              patchAssistant((m) => ({
                ...m,
                citations: ev.citations,
                isStreaming: false,
              }))
              break
            case "error":
              patchAssistant((m) => ({
                ...m,
                isStreaming: false,
                streamError: ev.message,
              }))
              break
          }
        }
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderId,
            ...(sessionId ? { sessionId } : {}),
            messages: apiPayload,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(j?.error ?? `Chat failed (${res.status})`)
        }

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ""

        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const { events, rest } = parseNdjsonLines(buf)
          buf = rest
          applyEvents(events)
        }
        if (buf.trim()) {
          try {
            applyEvents([JSON.parse(buf.trim()) as StreamEvent])
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        const msg = e instanceof Error ? e.message : "Chat failed"
        setError(msg)
        patchAssistant((m) => ({ ...m, isStreaming: false, streamError: msg }))
      } finally {
        setLoading(false)
        abortRef.current = null
      }
    },
    [folderId, sessionId, loading]
  )

  const prependBootstrapAssistant = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
          citations: null,
        },
      ]
    })
  }, [])

  const resetChat = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setError(null)
    setMessages([])
  }, [])

  return {
    messages,
    hydrate,
    sendMessage,
    loading,
    error,
    prependBootstrapAssistant,
    resetChat,
  }
}
