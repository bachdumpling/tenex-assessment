"use client"

import { cn } from "@/lib/utils"
import type { Citation } from "@/types/citations"

type CitationChipProps = {
  citation: Citation
  onOpen: (c: Citation) => void
}

export function CitationChip({ citation, onOpen }: CitationChipProps) {
  return (
    <button
      type="button"
      title={citation.documentName}
      onClick={() => onOpen(citation)}
      className={cn(
        "mx-0.5 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-sm border border-primary/40 bg-primary/15 px-1 font-mono text-[10px] font-semibold text-primary tabular-nums transition-colors",
        "hover:border-primary hover:bg-primary/25 hover:text-primary-foreground"
      )}
    >
      {citation.index}
    </button>
  )
}
