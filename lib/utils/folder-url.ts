const FOLDER_PATH = /\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/

export type ParseFolderUrlResult =
  | { ok: true; folderId: string }
  | { ok: false; error: string }

/**
 * Accepts a full Google Drive folder URL or a bare folder id string.
 */
export function parseDriveFolderUrl(input: string): ParseFolderUrlResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, error: "Paste a Google Drive folder link." }
  }

  if (!trimmed.includes("/") && !trimmed.includes("?")) {
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
      return { ok: true, folderId: trimmed }
    }
    return { ok: false, error: "That does not look like a valid folder id." }
  }

  try {
    const url = new URL(trimmed)
    const host = url.hostname.replace(/^www\./, "")

    if (host === "drive.google.com") {
      const fromPath = url.pathname.match(FOLDER_PATH)
      if (fromPath?.[1]) {
        return { ok: true, folderId: fromPath[1] }
      }
      const idParam = url.searchParams.get("id")
      if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) {
        return { ok: true, folderId: idParam }
      }
    }

    if (host === "docs.google.com") {
      const open = url.pathname.match(/^\/open$/)
      if (open) {
        const id = url.searchParams.get("id")
        if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
          return { ok: true, folderId: id }
        }
      }
    }
  } catch {
    return { ok: false, error: "Could not parse that URL." }
  }

  return {
    ok: false,
    error: "Use a Drive folder link (drive.google.com/drive/folders/…).",
  }
}
