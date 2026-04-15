import type { Citation } from "@/types/citations"

export type ReasoningItem =
  | {
      kind: "tool_call"
      toolName: string
      toolCallId: string
      input: unknown
    }
  | { kind: "tool_result"; toolCallId: string; output: unknown }

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[] | null
  reasoning?: ReasoningItem[]
  isStreaming?: boolean
  streamError?: string | null
}
