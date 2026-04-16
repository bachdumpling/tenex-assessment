"use client"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

type StaleIndexBannerProps = {
  onReindex: () => void
  busy: boolean
}

export function StaleIndexBanner({ onReindex, busy }: StaleIndexBannerProps) {
  return (
    <Alert>
      <RefreshCw aria-hidden />
      <AlertTitle>Folder may be out of date</AlertTitle>
      <AlertDescription>
        One or more files changed in Google Drive after they were last indexed.
        Re-index to refresh search and chat answers.
      </AlertDescription>
      <AlertAction>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            onReindex()
          }}
        >
          {busy ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" aria-hidden />
              Re-indexing…
            </>
          ) : (
            <>
              <RefreshCw className="size-3.5" aria-hidden />
              Re-index folder
            </>
          )}
        </Button>
      </AlertAction>
    </Alert>
  )
}
