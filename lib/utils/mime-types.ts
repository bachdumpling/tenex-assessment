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
