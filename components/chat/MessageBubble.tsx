"use client"

import { AssistantTypingBubble } from "@/components/chat/AssistantTypingBubble"
import { CitationChip } from "@/components/chat/CitationChip"
import { ReasoningTrace } from "@/components/chat/ReasoningTrace"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types/chat"
import type { Citation } from "@/types/citations"
import type { Components } from "react-markdown"
import type { ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const DOC_MARKER =
  /\[doc:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi

function citationForChunk(
  citations: Citation[] | null | undefined,
  chunkId: string
): Citation | null {
  if (!citations?.length) return null
  const id = chunkId.toLowerCase()
  return citations.find((c) => c.chunkId.toLowerCase() === id) ?? null
}

type DocPart =
  | { type: "md"; value: string }
  | { type: "cite"; chunkId: string }

const assistantMarkdownPlugins = [remarkGfm]

const assistantMarkdownComponents: Partial<Components> = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-2 scroll-m-20 font-heading text-lg font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 mb-2 scroll-m-20 font-heading text-base font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 scroll-m-20 font-heading text-sm font-semibold text-foreground first:mt-4">
      {children}
    </h3>
  ),
  hr: () => <hr className="my-8 border-border/50" />,
  table({ children }) {
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-md border border-border bg-muted/10">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-muted/50">{children}</thead>
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>
  },
  tr({ children }) {
    return <tr className="border-b border-border/50 last:border-0">{children}</tr>
  },
  th({ children }) {
    return (
      <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-3 py-2 align-top text-sm text-foreground/95">{children}</td>
    )
  },
  p({ children }) {
    return (
      <p className="my-0 text-pretty leading-relaxed text-foreground first:mt-0 [&:not(:first-child)]:mt-3">
        {children}
      </p>
    )
  },
}

function splitWithDocMarkers(text: string): DocPart[] {
  const out: DocPart[] = []
  let last = 0
  DOC_MARKER.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DOC_MARKER.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: "md", value: text.slice(last, m.index) })
    }
    out.push({ type: "cite", chunkId: m[1].toLowerCase() })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: "md", value: text.slice(last) })
  return out
}

function renderAssistantDocPart(
  part: DocPart,
  index: number,
  message: ChatMessage,
  showCitations: boolean,
  onOpenCitation: (c: Citation) => void
): ReactNode {
  if (part.type === "md") {
    if (!part.value) return null
    return (
      <div
        key={index}
        className="assistant-md-block min-w-0 text-foreground [&:not(:first-child)]:mt-3"
      >
        <ReactMarkdown
          remarkPlugins={assistantMarkdownPlugins}
          components={assistantMarkdownComponents}
        >
          {part.value}
        </ReactMarkdown>
      </div>
    )
  }
  if (!showCitations) {
    return (
      <span key={index} className="font-mono text-[11px] text-muted-foreground">
        [doc:{part.chunkId}]
      </span>
    )
  }
  const citation = citationForChunk(message.citations, part.chunkId)
  if (citation) {
    return (
      <CitationChip key={index} citation={citation} onOpen={onOpenCitation} />
    )
  }
  return (
    <code
      key={index}
      className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground"
    >
      [{part.chunkId.slice(0, 8)}…]
    </code>
  )
}

type MessageBubbleProps = {
  message: ChatMessage
  onOpenCitation: (c: Citation) => void
}

export function MessageBubble({ message, onOpenCitation }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const showCitations = Boolean(
    !message.isStreaming && message.citations?.length
  )
  const showInitialTyping =
    message.role === "assistant" &&
    message.isStreaming &&
    !message.content.trim() &&
    !(message.reasoning?.length)

  return (
    <div
      className={cn(
        "max-w-[min(100%,52rem)] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "ml-auto border-border/60 bg-muted/40 text-foreground"
          : "mr-auto border-border/40 bg-card/60 text-foreground shadow-sm"
      )}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : (
        <>
          {showInitialTyping ? <AssistantTypingBubble /> : null}
          <ReasoningTrace items={message.reasoning} />
          <div className="max-w-none space-y-2 pt-1 text-foreground [&>.assistant-md-block:first-of-type]:mt-4 [&_.assistant-md-block_a]:text-primary [&_.assistant-md-block_a]:underline [&_.assistant-md-block_a]:underline-offset-2 [&_.assistant-md-block_code]:rounded [&_.assistant-md-block_code]:bg-muted/50 [&_.assistant-md-block_code]:px-1 [&_.assistant-md-block_code]:font-mono [&_.assistant-md-block_code]:text-xs [&_.assistant-md-block_li]:my-0.5 [&_.assistant-md-block_ol]:my-2 [&_.assistant-md-block_ol]:list-decimal [&_.assistant-md-block_ol]:pl-5 [&_.assistant-md-block_ul]:my-2 [&_.assistant-md-block_ul]:list-disc [&_.assistant-md-block_ul]:pl-5">
            {splitWithDocMarkers(message.content).map((part, i) =>
              renderAssistantDocPart(part, i, message, showCitations, onOpenCitation)
            )}
          </div>
          {message.streamError ? (
            <p className="mt-2 text-xs text-destructive">{message.streamError}</p>
          ) : null}
        </>
      )}
    </div>
  )
}
