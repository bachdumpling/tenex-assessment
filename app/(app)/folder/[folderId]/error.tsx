"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { House } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

export default function FolderError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          This folder page could not be loaded. You can try again or return home.
        </p>
        {error.message ? (
          <p className="text-xs text-destructive/90">{error.message}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex items-center gap-1.5"
          )}
        >
          <House className="size-4 shrink-0" aria-hidden />
          Home
        </Link>
      </div>
    </div>
  )
}
