import "server-only"

import type { StreamEvent } from "@/types/agent"
import type { Citation } from "@/types/citations"

export type NdjsonCaptureResult = {
  assistantText: string
  citations: Citation[]
  sawError: boolean
  errorMessage: string | null
}

/**
 * Forwards bytes from `source` and parses complete NDJSON lines to capture
 * assistant text (from `text` deltas) and final `done` / `error` events.
 */
export function forwardNdjsonStreamWithCapture(
  source: ReadableStream<Uint8Array>,
  onComplete: (result: NdjsonCaptureResult) => void | Promise<void>
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      const reader = source.getReader()
      let lineBuf = ""
      let assistantText = ""
      let citations: Citation[] = []
      let sawError = false
      let errorMessage: string | null = null

      const flushLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return
        let ev: StreamEvent
        try {
          ev = JSON.parse(trimmed) as StreamEvent
        } catch {
          return
        }
        switch (ev.type) {
          case "text":
            assistantText += ev.delta
            break
          case "done":
            citations = ev.citations
            break
          case "error":
            sawError = true
            errorMessage = ev.message
            break
          default:
            break
        }
      }

      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (value?.byteLength) controller.enqueue(value)
          lineBuf += decoder.decode(value, { stream: true })
          const parts = lineBuf.split("\n")
          lineBuf = parts.pop() ?? ""
          for (const p of parts) flushLine(p)
        }
        if (lineBuf.trim()) flushLine(lineBuf)
      } catch (e) {
        sawError = true
        errorMessage = e instanceof Error ? e.message : String(e)
      } finally {
        try {
          reader.releaseLock()
        } catch {
          /* ignore */
        }
        try {
          await onComplete({
            assistantText,
            citations,
            sawError,
            errorMessage,
          })
        } catch {
          /* persistence must not break the stream */
        }
        controller.close()
      }
    },
  })
}
