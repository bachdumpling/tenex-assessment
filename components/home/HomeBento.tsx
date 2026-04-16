import { bentoPanelChrome, bentoPanelClass } from "@/components/layout/bento-panel"
import { cn } from "@/lib/utils"

type HomeBentoProps = {
  hero: React.ReactNode
  account: React.ReactNode
  folderLink: React.ReactNode
  recents: React.ReactNode
}

/** Home route bento grid; tiles use the same chrome as folder `SegmentViewNode` panels. */
export function HomeBento({ hero, account, folderLink, recents }: HomeBentoProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-4">
        <section
          aria-label="Getting started"
          className={cn(bentoPanelClass, "md:col-start-1 md:row-start-1")}
        >
          {hero}
        </section>
        <section
          aria-label="Your account"
          className={cn(
            bentoPanelClass,
            "flex flex-col justify-center md:col-start-2 md:row-start-1"
          )}
        >
          {account}
        </section>
        <section
          aria-label="Open a folder"
          className={cn(bentoPanelClass, "md:col-span-2 md:col-start-1 md:row-start-2")}
        >
          {folderLink}
        </section>
        <section
          aria-label="Recent folders"
          className={cn(
            bentoPanelChrome,
            "flex min-h-56 flex-col overflow-hidden md:col-span-2 md:col-start-1 md:row-start-3 md:max-h-[min(50svh,28rem)]"
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">{recents}</div>
        </section>
      </div>
    </div>
  )
}
