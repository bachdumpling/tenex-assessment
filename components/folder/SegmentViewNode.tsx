"use client"

import { cn } from "@/lib/utils"

type SegmentViewNodeProps = {
  meta: React.ReactNode
  files: React.ReactNode
  chat: React.ReactNode
  className?: string
}

/**
 * Full-viewport bento shell: left ~⅓ (meta + files, each scroll-y), right ~⅔ chat.
 */
export function SegmentViewNode({ meta, files, chat, className }: SegmentViewNodeProps) {
  const cell =
    "min-h-0 overflow-y-auto rounded-xl border border-border bg-card/40 p-4 shadow-sm"

  return (
    <div
      className={cn(
        "fixed inset-0 z-0 grid min-h-0 w-full gap-3 overflow-hidden bg-background p-3",
        "grid-cols-1 grid-rows-[auto_minmax(0,32vh)_minmax(0,1fr)]",
        "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:grid-rows-[minmax(0,auto)_minmax(0,1fr)] md:gap-4 md:p-4",
        className
      )}
    >
      <section
        className={cn(cell, "col-start-1 row-start-1 md:row-start-1")}
        aria-label="Folder overview"
      >
        {meta}
      </section>
      <section
        className={cn(cell, "col-start-1 row-start-2 md:row-start-2")}
        aria-label="Files"
      >
        {files}
      </section>
      <section
        className={cn(
          "col-start-1 row-start-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/40 shadow-sm",
          "md:col-start-2 md:row-span-2 md:row-start-1"
        )}
        aria-label="Chat"
      >
        {chat}
      </section>
    </div>
  )
}
