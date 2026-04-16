import { cn } from "@/lib/utils"

const cell =
  "min-h-0 overflow-hidden rounded-xl border border-border bg-card/40 p-4 shadow-sm"

export default function FolderLoading() {
  return (
    <div
      className={cn(
        "fixed inset-0 z-0 grid min-h-0 w-full gap-3 overflow-hidden bg-background p-3",
        "grid-cols-1 grid-rows-[auto_minmax(0,32vh)_minmax(0,1fr)]",
        "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:grid-rows-[minmax(0,auto)_minmax(0,1fr)] md:gap-4 md:p-4"
      )}
    >
      <section
        className={cn(cell, "col-start-1 row-start-1 md:row-start-1")}
        aria-hidden
      >
        <div className="space-y-3">
          <div className="h-5 w-24 animate-pulse rounded-md bg-muted/60" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted/40" />
          <div className="h-2 w-full animate-pulse rounded-full bg-muted/50" />
        </div>
      </section>
      <section
        className={cn(cell, "col-start-1 row-start-2 md:row-start-2")}
        aria-hidden
      >
        <div className="mb-3 h-4 w-16 animate-pulse rounded-md bg-muted/50" />
        <div className="flex flex-col gap-2">
          {["a", "b", "c", "d"].map((k) => (
            <div
              key={k}
              className="h-14 animate-pulse rounded-md border border-border/60 bg-muted/30"
            />
          ))}
        </div>
      </section>
      <section
        className={cn(
          "col-start-1 row-start-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/40 shadow-sm",
          "md:col-start-2 md:row-span-2 md:row-start-1"
        )}
        aria-hidden
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 border-b border-border/60 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded-md bg-muted/50" />
              <div className="h-3 w-56 max-w-full animate-pulse rounded-md bg-muted/35" />
            </div>
            <div className="h-9 w-28 shrink-0 animate-pulse rounded-md bg-muted/40" />
          </div>
          <div className="min-h-0 flex-1 rounded-lg border border-dashed border-border/80 bg-muted/20" />
          <div className="h-24 shrink-0 animate-pulse rounded-lg bg-muted/30" />
        </div>
      </section>
    </div>
  )
}
