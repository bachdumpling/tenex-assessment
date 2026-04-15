import type { Citation } from "@/types/citations"

export type StreamEventToolCall = {
  type: "tool_call"
  toolName: string
  toolCallId: string
  input: unknown
}

export type StreamEventToolResult = {
  type: "tool_result"
  toolCallId: string
  output: unknown
}

export type StreamEventText = {
  type: "text"
  delta: string
}

export type StreamEventDone = {
  type: "done"
  citations: Citation[]
}

export type StreamEvent =
  | StreamEventToolCall
  | StreamEventToolResult
  | StreamEventText
  | StreamEventDone
