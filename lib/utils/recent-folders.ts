/** Client-only MRU list of opened Drive folders (localStorage). */

export const RECENT_FOLDERS_STORAGE_KEY = "ttaf:recentFolders"

export const RECENT_FOLDERS_CHANGED_EVENT = "ttaf-recent-folders"

const MAX_ENTRIES = 8

export type RecentFolderEntry = {
  folderId: string
  label: string
  visitedAt: number
}

function parseStored(raw: string | null): RecentFolderEntry[] {
  if (!raw) return []
  try {
    const j = JSON.parse(raw) as unknown
    if (!Array.isArray(j)) return []
    const out: RecentFolderEntry[] = []
    for (const item of j) {
      if (!item || typeof item !== "object") continue
      const o = item as Record<string, unknown>
      const folderId = typeof o.folderId === "string" ? o.folderId.trim() : ""
      const label =
        typeof o.label === "string" && o.label.trim()
          ? o.label.trim()
          : "Drive folder"
      const visitedAt =
        typeof o.visitedAt === "number" && Number.isFinite(o.visitedAt)
          ? o.visitedAt
          : Date.now()
      if (folderId) out.push({ folderId, label, visitedAt })
    }
    return out.slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function readRecentFolders(): RecentFolderEntry[] {
  if (typeof window === "undefined") return []
  return parseStored(localStorage.getItem(RECENT_FOLDERS_STORAGE_KEY))
}

export function touchRecentFolder(params: {
  folderId: string
  label: string
}): void {
  if (typeof window === "undefined") return
  const folderId = params.folderId.trim()
  if (!folderId) return
  const label =
    params.label.trim() ||
    (folderId.length > 12 ? `${folderId.slice(0, 8)}…` : folderId)
  const prev = parseStored(
    localStorage.getItem(RECENT_FOLDERS_STORAGE_KEY)
  ).filter((e) => e.folderId !== folderId)
  const next: RecentFolderEntry[] = [
    { folderId, label, visitedAt: Date.now() },
    ...prev,
  ].slice(0, MAX_ENTRIES)
  localStorage.setItem(RECENT_FOLDERS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(RECENT_FOLDERS_CHANGED_EVENT))
}
