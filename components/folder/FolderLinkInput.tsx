"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { parseDriveFolderUrl } from "@/lib/utils/folder-url"
import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"

type FolderLinkInputProps = {
  className?: string
}

export function FolderLinkInput({ className }: FolderLinkInputProps) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    const parsed = parseDriveFolderUrl(value)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    router.push(`/folder/${parsed.folderId}`)
  }

  return (
    <div className={cn("flex w-full max-w-xl flex-col gap-3", className)}>
      <label className="font-medium text-foreground" htmlFor="folder-url">
        Google Drive folder link
      </label>
      <div className="relative w-full min-w-0">
        <textarea
          id="folder-url"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="https://drive.google.com/drive/folders/…"
          className="w-full min-h-12 max-h-32 resize-y rounded-md border border-input bg-background px-3 py-1.5 pr-11 pb-8 text-foreground outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <div className="pointer-events-none absolute bottom-4 right-2 z-10 flex items-center [&_button]:pointer-events-auto">
          <Button
            type="button"
            size="icon-sm"
            variant="default"
            className="shadow-sm"
            aria-label="Open folder"
            onClick={() => {
              submit()
            }}
          >
            <ArrowUp className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
    </div>
  )
}
