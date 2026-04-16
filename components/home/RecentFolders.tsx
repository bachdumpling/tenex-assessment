"use client"

import {
  readRecentFolders,
  RECENT_FOLDERS_CHANGED_EVENT,
  type RecentFolderEntry,
} from "@/lib/utils/recent-folders"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { FolderOpen } from "lucide-react"
import { useEffect, useState } from "react"

type RecentFoldersProps = {
  className?: string
}

function formatVisited(visitedAt: number): string {
  const diffMs = Date.now() - visitedAt
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return "Just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(visitedAt).toLocaleDateString()
}

export function RecentFolders({ className }: RecentFoldersProps) {
  const [items, setItems] = useState<RecentFolderEntry[]>([])

  useEffect(() => {
    function refresh() {
      setItems(readRecentFolders())
    }
    refresh()
    window.addEventListener("storage", refresh)
    window.addEventListener(RECENT_FOLDERS_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener(RECENT_FOLDERS_CHANGED_EVENT, refresh)
    }
  }, [])

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center",
          className
        )}
      >
        <p className="text-muted-foreground">
          Recent folders will show up here after you open one.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="font-heading text-base font-semibold text-foreground">Recent folders</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.folderId}>
            <Link
              href={`/folder/${encodeURIComponent(item.folderId)}`}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5",
                "transition-colors hover:bg-muted/40"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FolderOpen
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 truncate font-medium text-foreground">
                  {item.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                {formatVisited(item.visitedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
