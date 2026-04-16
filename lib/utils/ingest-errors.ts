/**
 * Maps raw ingest / Drive errors to short, user-safe copy for the UI.
 * Safe to import from client or server (no server-only).
 */

const DEFAULT =
  "Couldn’t index this file. Try again, or use a supported format (Doc, Sheet, Slide, PDF, or plain text)."

const PDF_ENV =
  "PDF processing isn’t available in this environment right now. Try again later, or use a Google Doc export instead of a raw PDF."

const NETWORK = "Network error talking to Google. Try again in a moment."

const GENERIC_READ = "Something went wrong while reading this file."

function looksLikeFilesystemOrBundleLeak(s: string): boolean {
  const lower = s.toLowerCase()
  return (
    lower.includes("node_modules") ||
    lower.includes("cannot find module") ||
    lower.includes("imported from") ||
    /\/users\/[^/\s]+/i.test(s) ||
    /\/home\/[^/\s]+/i.test(s) ||
    /[A-Za-z]:\\[^<\n]{20,}/.test(s) ||
    /\bat\s+[\w.$]+\s+\(/m.test(s)
  )
}

function isLikelyBenignPipelineMessage(s: string): boolean {
  const t = s.trim()
  if (t.length > 220) return false
  if (looksLikeFilesystemOrBundleLeak(t)) return false
  const needles = [
    "File is not in this folder.",
    "No indexable text extracted from file.",
    "Extracted text too large",
    "Too many chunks",
    "File too large to index",
    "This file type isn’t supported for indexing yet.",
    "Subfolders aren’t indexed",
    "Nested folders are skipped.",
    "Only files are indexed",
  ]
  return needles.some((p) => t.includes(p))
}

export function formatIngestErrorForDisplay(raw: string | null | undefined): string {
  if (raw == null) return DEFAULT
  const trimmed = raw.trim()
  if (!trimmed) return DEFAULT

  const lower = trimmed.toLowerCase()

  if (
    lower.includes("pdf.worker") ||
    lower.includes("pdfjs-dist") ||
    lower.includes("setting up fake worker") ||
    lower.includes("fake worker failed")
  ) {
    return PDF_ENV
  }

  if (
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("socket hang up") ||
    lower.includes("fetch failed")
  ) {
    return NETWORK
  }

  if (looksLikeFilesystemOrBundleLeak(trimmed)) {
    return GENERIC_READ
  }

  if (isLikelyBenignPipelineMessage(trimmed)) {
    return trimmed
  }

  if (trimmed.length <= 200 && !/[\\/]node_modules[\\/]/i.test(trimmed)) {
    return trimmed
  }

  return DEFAULT
}
