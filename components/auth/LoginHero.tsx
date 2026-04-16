"use client"

import Waves from "@/components/Waves"
import { cn } from "@/lib/utils"

type LoginHeroProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Full-height login shell: animated waves background + readable hero card.
 */
export function LoginHero({ children, className }: LoginHeroProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6",
        className
      )}
    >
      <div className="absolute inset-0 z-0 bg-background" aria-hidden>
        <Waves
          lineColor="oklch(0.705 0.015 286.067 / 0.55)"
          backgroundColor="transparent"
          waveAmpX={32}
          waveAmpY={16}
          xGap={11}
          yGap={26}
          showCursorDot={false}
          className="opacity-100"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-1 bg-linear-to-b from-background/88 via-background/48 to-background/88"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-10">
        <header className="text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Auth
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Talk to your folder
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
            This app is your read-only bridge to Google Drive. Pick any folder you can open, we
            index the supported files, and you chat with an assistant that answers from that
            material and cites the exact chunks it used.
          </p>
        </header>
        <div className="w-full max-w-sm px-6">
          {children}
        </div>
      </div>
    </div>
  )
}
