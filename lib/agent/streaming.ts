import "server-only"

import { buildCitationsForText } from "@/lib/agent/citations"
import { ANTHROPIC_MESSAGES_MODEL } from "@/lib/agent/model"
import { AGENT_TOOLS, executeAgentTool } from "@/lib/agent/tools"
import { HttpStatusError, retryWithBackoff } from "@/lib/utils/retry"
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

type AnthropicError = Error & { status?: number }

/** Run one model turn: stream text deltas, then return the final Message. */
async function runOneRound(
  client: Anthropic,
  args: {
    model: string
    max_tokens: number
    system: string
    tools: typeof AGENT_TOOLS
    messages: MessageParam[]
  },
  onTextDelta: (delta: string) => void,
  signal: AbortSignal | undefined
): Promise<{ final: Message; turnText: string }> {
  let turnText = ""
  const stream = client.messages.stream(args, { signal })
  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        const delta = ev.delta.text
        turnText += delta
        onTextDelta(delta)
      }
    }
  } catch (err) {
    const e = err as AnthropicError
    if (turnText.length === 0 && typeof e.status === "number") {
      throw new HttpStatusError(e.status, e.message)
    }
    throw err
  }
  const final = await stream.finalMessage()
  return { final, turnText }
}

export function runAgentNdjsonStream(options: {
  folderId: string
  messages: MessageParam[]
  systemPrompt: string
  signal?: AbortSignal
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const { folderId, systemPrompt, signal } = options
  const anthropicMessages: MessageParam[] = [...options.messages]

  return new ReadableStream({
    async start(controller) {
      let closed = false
      const safeEnqueue = (bytes: Uint8Array) => {
        if (closed) return
        try {
          controller.enqueue(bytes)
        } catch {
          closed = true
        }
      }
      const safeClose = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          /* ignore */
        }
      }
      const emit = (ev: StreamEvent) => {
        safeEnqueue(encoder.encode(`${JSON.stringify(ev)}\n`))
      }

      try {
        const client = getClient()
        let lastAnswerText = ""

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          if (signal?.aborted) {
            safeClose()
            return
          }

          const { final, turnText } = await retryWithBackoff(
            (attemptSignal) =>
              runOneRound(
                client,
                {
                  model: ANTHROPIC_MESSAGES_MODEL,
                  max_tokens: MAX_TOKENS,
                  system: systemPrompt,
                  tools: AGENT_TOOLS,
                  messages: anthropicMessages,
                },
                (delta) => emit({ type: "text", delta }),
                attemptSignal
              ),
            {
              label: `Anthropic messages.stream round ${round}`,
              timeoutMs: 9500,
              signal,
            }
          )

          const toolBlocks = final.content.filter(
            (b): b is ToolUseBlock => b.type === "tool_use"
          )

          if (final.stop_reason !== "tool_use" || toolBlocks.length === 0) {
            lastAnswerText = turnText || textFromMessage(final)
            const citations = await buildCitationsForText(lastAnswerText, folderId)
            emit({ type: "done", citations })
            safeClose()
            return
          }

          anthropicMessages.push({ role: "assistant", content: final.content })

          const toolResults: ToolResultBlockParam[] = []
          for (const block of toolBlocks) {
            if (signal?.aborted) {
              safeClose()
              return
            }
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
        safeClose()
      } catch (e) {
        if (signal?.aborted) {
          safeClose()
          return
        }
        const msg = e instanceof Error ? e.message : String(e)
        emit({ type: "error", message: msg })
        emit({ type: "done", citations: [] })
        safeClose()
      }
    },
  })
}
