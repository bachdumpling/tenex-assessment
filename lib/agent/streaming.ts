import "server-only"

import { buildCitationsForText } from "@/lib/agent/citations"
import { ANTHROPIC_MESSAGES_MODEL } from "@/lib/agent/model"
import { AGENT_TOOLS, executeAgentTool } from "@/lib/agent/tools"
import type { StreamEvent } from "@/types/agent"
import Anthropic from "@anthropic-ai/sdk"
import type {
  Message,
  MessageParam,
  TextBlock,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages"

const MAX_TOOL_ROUNDS = 8
const MAX_TOKENS = 2048

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not set.")
  }
  return new Anthropic({ apiKey: key })
}

function textFromMessage(message: Message): string {
  return message.content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
}

export function runAgentNdjsonStream(options: {
  folderId: string
  messages: MessageParam[]
  systemPrompt: string
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const { folderId, systemPrompt } = options
  const anthropicMessages: MessageParam[] = [...options.messages]

  return new ReadableStream({
    async start(controller) {
      const emit = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`))
      }

      try {
        const client = getClient()
        let lastAnswerText = ""

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = client.messages.stream({
            model: ANTHROPIC_MESSAGES_MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            tools: AGENT_TOOLS,
            messages: anthropicMessages,
          })

          let turnText = ""
          for await (const ev of stream) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
              const delta = ev.delta.text
              turnText += delta
              emit({ type: "text", delta })
            }
          }

          const final = await stream.finalMessage()
          const toolBlocks = final.content.filter(
            (b): b is ToolUseBlock => b.type === "tool_use"
          )

          if (final.stop_reason !== "tool_use" || toolBlocks.length === 0) {
            lastAnswerText = turnText || textFromMessage(final)
            const citations = await buildCitationsForText(lastAnswerText, folderId)
            emit({ type: "done", citations })
            controller.close()
            return
          }

          anthropicMessages.push({ role: "assistant", content: final.content })

          const toolResults: ToolResultBlockParam[] = []
          for (const block of toolBlocks) {
            emit({
              type: "tool_call",
              toolName: block.name,
              toolCallId: block.id,
              input: block.input,
            })
            try {
              const output = await executeAgentTool(block.name, block.input, folderId)
              emit({ type: "tool_result", toolCallId: block.id, output })
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(output),
              })
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              emit({
                type: "tool_result",
                toolCallId: block.id,
                output: { error: msg },
              })
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                is_error: true,
                content: msg,
              })
            }
          }

          anthropicMessages.push({ role: "user", content: toolResults })
        }

        emit({
          type: "error",
          message: "Agent stopped: maximum tool rounds exceeded.",
        })
        const citations = await buildCitationsForText(lastAnswerText, folderId)
        emit({ type: "done", citations })
        controller.close()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        emit({ type: "error", message: msg })
        emit({ type: "done", citations: [] })
        controller.close()
      }
    },
  })
}
