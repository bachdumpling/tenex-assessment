import "server-only"

import { fetchChunksWithDocumentsForFolder } from "@/lib/db/queries/chunks"
import type { Citation } from "@/types/citations"

const DOC_ID =
  /\[doc:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi

const SNIPPET_MAX = 600

function truncateSnippet(text: string): string {
  const t = text.trim()
  if (t.length <= SNIPPET_MAX) return t
  return `${t.slice(0, SNIPPET_MAX)}…`
}

/** First-seen order, deduplicated chunk UUIDs from assistant text. */
export function parseDocChunkIdsFromText(text: string): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const m of text.matchAll(DOC_ID)) {
    const id = m[1].toLowerCase()
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }
  return order
}

/** Resolve markers to citation records; unknown ids are skipped. */
export async function buildCitationsForText(
  text: string,
  folderId: string
): Promise<Citation[]> {
  const ids = parseDocChunkIdsFromText(text)
  if (ids.length === 0) return []

  const metaByChunk = await fetchChunksWithDocumentsForFolder(ids, folderId)
  const citations: Citation[] = []
  let index = 1
  for (const id of ids) {
    const meta = metaByChunk.get(id)
    if (!meta) continue
    citations.push({
      index,
      chunkId: meta.chunkId,
      documentId: meta.documentId,
      documentName: meta.documentName,
      driveUrl: meta.driveUrl,
      section: meta.section,
      pageNumber: meta.pageNumber,
      snippet: truncateSnippet(meta.snippet),
    })
    index += 1
  }
  return citations
}
