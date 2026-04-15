/**
 * Maps Drive MIME types to ingestion extractor (Phase 2).
 * Unsupported types should be marked skipped with a reason — never silent drops.
 */

export type ExtractorKind =
  | "google-doc"
  | "google-sheet"
  | "google-slide"
  | "pdf"
  | "plaintext"
  | "unsupported"

const MIME_MAP: Record<string, ExtractorKind> = {
  "application/vnd.google-apps.document": "google-doc",
  "application/vnd.google-apps.spreadsheet": "google-sheet",
  "application/vnd.google-apps.presentation": "google-slide",
  "application/pdf": "pdf",
  "text/plain": "plaintext",
  "text/markdown": "plaintext",
  "text/csv": "plaintext",
}

export function getExtractorKind(mimeType: string): ExtractorKind {
  return MIME_MAP[mimeType] ?? "unsupported"
}

export function isSupportedMimeType(mimeType: string): boolean {
  return getExtractorKind(mimeType) !== "unsupported"
}

/** User-visible file type (file list, cards). */
const MIME_LABEL: Record<string, string> = {
  "application/vnd.google-apps.document": "Google Doc",
  "application/vnd.google-apps.spreadsheet": "Google Sheet",
  "application/vnd.google-apps.presentation": "Google Slide",
  "application/vnd.google-apps.folder": "Folder",
  "application/vnd.google-apps.form": "Google Form",
  "application/vnd.google-apps.drawing": "Google Drawing",
  "application/vnd.google-apps.shortcut": "Shortcut",
  "application/pdf": "PDF",
  "text/plain": "Plain text",
  "text/markdown": "Markdown",
  "text/csv": "CSV",
  "application/zip": "Zip archive",
  "application/x-zip-compressed": "Zip archive",
}

function titleCaseFallback(mimeType: string): string {
  const base = mimeType.includes("/") ? mimeType.split("/").pop() ?? mimeType : mimeType
  const cleaned = base.replace(/^vnd\./, "").replace(/[.+_-]+/g, " ").trim()
  if (!cleaned) return "Other file"
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getMimeTypeLabel(mimeType: string): string {
  if (MIME_LABEL[mimeType]) return MIME_LABEL[mimeType]
  if (mimeType.startsWith("image/")) return "Image"
  if (mimeType.startsWith("video/")) return "Video"
  if (mimeType.startsWith("audio/")) return "Audio"
  return titleCaseFallback(mimeType)
}

/** Short explanation when a file is skipped for unsupported MIME (no raw MIME in UI). */
export function getUnsupportedIngestMessage(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.folder") {
    return "Nested folders are skipped."
  }
  return "This file type isn’t supported for indexing yet."
}

const TECHNICAL_UNSUPPORTED =
  /^Unsupported MIME type( for indexing)?:\s*/i

/**
 * Prefer friendly copy for legacy/API reasons that still embed raw MIME.
 */
export function displaySkipReasonForFile(
  skipReason: string | undefined,
  mimeType: string
): string {
  const trimmed = skipReason?.trim()
  if (!trimmed) return getUnsupportedIngestMessage(mimeType)
  if (TECHNICAL_UNSUPPORTED.test(trimmed)) {
    return getUnsupportedIngestMessage(mimeType)
  }
  return trimmed
}
