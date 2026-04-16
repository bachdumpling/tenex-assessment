"use client"

import { CitationSnippet } from "@/components/chat/CitationSnippet"
import { InlineMarkdown } from "@/components/chat/InlineMarkdown"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Citation } from "@/types/citations"
import { ExternalLink, X } from "lucide-react"

type CitationDrawerProps = {
  open: boolean
  citation: Citation | null
  onClose: () => void
}

export function CitationDrawer({ open, citation, onClose }: CitationDrawerProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
            Source
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close citation panel"
          >
            <X className="size-4" />
          </Button>
        </div>
        {citation ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Document
              </p>
              <p className="mt-1 font-medium text-foreground">{citation.documentName}</p>
            </div>
            {(citation.section || citation.pageNumber != null) && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {citation.section ? (
                  <span className="min-w-0 max-w-full">
                    <span className="text-muted-foreground/80">Section</span>{" "}
                    <InlineMarkdown text={citation.section} className="text-foreground" />
                  </span>
                ) : null}
                {citation.pageNumber != null ? (
                  <span>
                    <span className="text-muted-foreground/80">Page</span>{" "}
                    <span className="text-foreground">{citation.pageNumber}</span>
                  </span>
                ) : null}
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Excerpt
              </p>
              <CitationSnippet text={citation.snippet} />
            </div>
            <a
              href={citation.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-auto inline-flex w-full items-center justify-center gap-2"
              )}
            >
              Open in Drive
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </div>
        ) : (
          <p className="p-4 text-muted-foreground">No citation selected.</p>
        )}
      </aside>
    </>
  )
}
