"use client"

import { cn } from "@/lib/utils"

type AssistantTypingBubbleProps = {
  className?: string
}

/** Shown while the assistant turn has started but no tokens or tools yet. */
export function AssistantTypingBubble({ className }: AssistantTypingBubbleProps) {
  return (
    <div
      className={cn("mb-2 flex justify-start", className)}
      aria-live="polite"
      aria-busy="true"
      aria-label="Assistant is thinking"
    >
      <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-muted/40 px-3 py-2 shadow-sm">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-duration:0.9s] [animation-delay:-0.25s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-duration:0.9s] [animation-delay:-0.12s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-duration:0.9s]" />
      </div>
    </div>
  )
}
