"use client"

import type { ReasoningItem } from "@/types/chat"
import { ChevronRight } from "lucide-react"

/** Label for trace line; null when the tool input has no `query` field. */
function searchQueryLabel(input: unknown): string | null {
  if (!input || typeof input !== "object" || !("query" in input)) return null
  return String((input as { query?: unknown }).query)
}

function summarizeToolResult(toolName: string, output: unknown): string {
  if (!output || typeof output !== "object") return "ok"
  const o = output as Record<string, unknown>
  if (toolName === "search_documents" && Array.isArray(o.chunks)) {
    return `${o.chunks.length} chunk(s)`
  }
  if (toolName === "get_document_overview" && Array.isArray(o.documents)) {
    return `${o.documents.length} file(s)`
  }
  if (toolName === "get_chunk_context" && Array.isArray(o.chunks)) {
    return `${o.chunks.length} segment(s)`
  }
  if ("error" in o && typeof o.error === "string") return `error: ${o.error}`
  return "ok"
}

function toolNameForResult(items: ReasoningItem[], toolCallId: string): string {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    if (it.kind === "tool_call" && it.toolCallId === toolCallId) return it.toolName
  }
  return "tool"
}

type ReasoningTraceProps = {
  items: ReasoningItem[] | undefined
}

export function ReasoningTrace({ items }: ReasoningTraceProps) {
  if (!items?.length) return null

  return (
    <details className="group mb-3 rounded-md border border-border/80 bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
        Reasoning trace
        <span className="ml-auto tabular-nums text-xs opacity-70">
          {items.filter((i) => i.kind === "tool_call").length} tool call(s)
        </span>
      </summary>
      <ol className="space-y-2 border-t border-border/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {items.map((item, idx) => {
          if (item.kind === "tool_call") {
            const query =
              item.toolName === "search_documents"
                ? searchQueryLabel(item.input)
                : null
            return (
              <li key={`${item.toolCallId}-call-${idx}`} className="text-foreground/90">
                <span className="text-primary/90">{item.toolName}</span>
                {query ? (
                  <span className="text-muted-foreground"> — “{query}”</span>
                ) : null}
              </li>
            )
          }
          return (
            <li key={`${item.toolCallId}-res-${idx}`} className="pl-3 text-muted-foreground">
              →{" "}
              {summarizeToolResult(
                toolNameForResult(items.slice(0, idx + 1), item.toolCallId),
                item.output
              )}
            </li>
          )
        })}
      </ol>
    </details>
  )
}
