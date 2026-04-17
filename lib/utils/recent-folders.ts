/** Client-only MRU list of opened Drive folders (localStorage), scoped per user. */

const STORAGE_KEY_PREFIX = "ttaf:recentFolders"
const LEGACY_STORAGE_KEY = "ttaf:recentFolders"

export const RECENT_FOLDERS_CHANGED_EVENT = "ttaf-recent-folders"

const MAX_ENTRIES = 8

export type RecentFolderEntry = {
  folderId: string
  label: string
  visitedAt: number
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`
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

/** Remove the pre-namespacing key so prior users' lists don't leak on shared browsers. */
function clearLegacyKeyIfPresent(): void {
  if (typeof window === "undefined") return
  if (localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
}

export function readRecentFolders(userId: string | null | undefined): RecentFolderEntry[] {
  if (typeof window === "undefined") return []
  clearLegacyKeyIfPresent()
  const id = userId?.trim()
  if (!id) return []
  return parseStored(localStorage.getItem(storageKey(id)))
}

export function touchRecentFolder(params: {
  userId: string | null | undefined
  folderId: string
  label: string
}): void {
  if (typeof window === "undefined") return
  clearLegacyKeyIfPresent()
  const userId = params.userId?.trim()
  if (!userId) return
  const folderId = params.folderId.trim()
  if (!folderId) return
  const label =
    params.label.trim() ||
    (folderId.length > 12 ? `${folderId.slice(0, 8)}…` : folderId)
  const key = storageKey(userId)
  const prev = parseStored(localStorage.getItem(key)).filter(
    (e) => e.folderId !== folderId
  )
  const next: RecentFolderEntry[] = [
    { folderId, label, visitedAt: Date.now() },
    ...prev,
  ].slice(0, MAX_ENTRIES)
  localStorage.setItem(key, JSON.stringify(next))
  window.dispatchEvent(new Event(RECENT_FOLDERS_CHANGED_EVENT))
}
