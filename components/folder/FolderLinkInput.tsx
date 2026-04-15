"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { parseDriveFolderUrl } from "@/lib/utils/folder-url"

export function FolderLinkInput() {
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
    <div className="flex w-full max-w-xl flex-col gap-3">
      <label className="text-sm font-medium text-foreground" htmlFor="folder-url">
        Google Drive folder link
      </label>
      <textarea
        id="folder-url"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://drive.google.com/drive/folders/…"
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" onClick={submit} className="self-start">
        Open folder
      </Button>
    </div>
  )
}
