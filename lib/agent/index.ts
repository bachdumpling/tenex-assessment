import "server-only"

import { buildFolderAgentSystemPrompt } from "@/lib/agent/prompts"
import { runAgentNdjsonStream } from "@/lib/agent/streaming"
import type { ChatApiMessage } from "@/types/agent"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"

export function mapChatMessagesToAnthropic(messages: ChatApiMessage[]): MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: "text" as const, text: m.content }],
  }))
}

export function createAgentNdjsonStream(params: {
  folderId: string
  messages: ChatApiMessage[]
}): ReadableStream<Uint8Array> {
  const systemPrompt = buildFolderAgentSystemPrompt(params.folderId)
  const anthropicMessages = mapChatMessagesToAnthropic(params.messages)
  return runAgentNdjsonStream({
    folderId: params.folderId,
    messages: anthropicMessages,
    systemPrompt,
  })
}
