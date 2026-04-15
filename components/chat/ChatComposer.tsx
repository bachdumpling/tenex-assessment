"use client"

import {
  PromptInput,
  PromptInputBody,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input"
import { cn } from "@/lib/utils"

type ChatComposerProps = {
  sessionId: string | null
  loading: boolean
  sendMessage: (text: string) => Promise<void>
}

function ChatComposerInner({
  sessionId,
  loading,
  sendMessage,
}: ChatComposerProps) {
  const { textInput } = usePromptInputController()
  const canSubmit = Boolean(sessionId && !loading && textInput.value.trim())

  return (
    <PromptInput
      className="w-full"
      onSubmit={async (msg) => {
        const t = msg.text.trim()
        if (!t || !sessionId || loading) return
        await sendMessage(t)
      }}
    >
      <PromptInputBody className="relative w-full min-w-0 flex-1">
        <PromptInputTextarea
          placeholder="Ask about your indexed files…"
          disabled={!sessionId || loading}
          className="min-h-[2.75rem] max-h-40 resize-y pr-12 pb-10"
        />
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 flex items-end [&_button]:pointer-events-auto">
          <PromptInputSubmit
            disabled={!canSubmit}
            status={loading ? "submitted" : "ready"}
            variant="default"
            className="shadow-sm"
          />
        </div>
      </PromptInputBody>
    </PromptInput>
  )
}

export function ChatComposer(props: ChatComposerProps) {
  return (
    <PromptInputProvider>
      <div
        className={cn(
          "mt-auto shrink-0 bg-background/95 py-3 backdrop-blur-sm"
        )}
      >
        <ChatComposerInner {...props} />
      </div>
    </PromptInputProvider>
  )
}
