import "server-only"

import { getServiceRoleClient } from "@/lib/db/supabase"
import type { TextChunk } from "@/lib/ingestion/chunker"

/** pgvector literal for PostgREST / Supabase `vector` column. */
export function formatVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`
}

export async function deleteChunksForDocument(documentId: string): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from("chunks").delete().eq("document_id", documentId)
  if (error) throw error
}

export async function insertChunksForDocument(
  documentId: string,
  folderId: string,
  chunks: TextChunk[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error("chunks and embeddings length mismatch")
  }
  const sb = getServiceRoleClient()
  const rows = chunks.map((c, i) => ({
    document_id: documentId,
    folder_id: folderId,
    content: c.content,
    embedding: formatVectorLiteral(embeddings[i]),
    chunk_index: c.chunkIndex,
    page_number: c.pageNumber,
    section: c.section,
    token_count: c.tokenCount,
    metadata: c.metadata,
  }))

  const { error } = await sb.from("chunks").insert(rows)
  if (error) throw error
}
