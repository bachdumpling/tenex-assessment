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

export type ChunkSearchRow = {
  id: string
  document_id: string
  folder_id: string
  content: string
  section: string | null
  page_number: number | null
  chunk_index: number
  distance: number
}

export async function searchChunksBySimilarity(params: {
  folderId: string
  queryEmbedding: number[]
  matchCount?: number
}): Promise<ChunkSearchRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb.rpc("match_chunks", {
    p_folder_id: params.folderId,
    p_query_embedding: formatVectorLiteral(params.queryEmbedding),
    p_match_count: params.matchCount ?? 12,
  })
  if (error) throw error
  return (data ?? []) as ChunkSearchRow[]
}

export type ChunkNeighborRow = {
  id: string
  chunk_index: number
  content: string
  section: string | null
  page_number: number | null
}

export async function getChunkWithNeighbors(
  chunkId: string,
  folderId: string,
  windowSize: number = 2
): Promise<ChunkNeighborRow[]> {
  const sb = getServiceRoleClient()
  const { data: target, error: errTarget } = await sb
    .from("chunks")
    .select("id, document_id, folder_id, chunk_index")
    .eq("id", chunkId)
    .maybeSingle()
  if (errTarget) throw errTarget
  if (!target || target.folder_id !== folderId) {
    return []
  }

  const minIdx = (target.chunk_index as number) - windowSize
  const maxIdx = (target.chunk_index as number) + windowSize
  const { data: rows, error: errRows } = await sb
    .from("chunks")
    .select("id, chunk_index, content, section, page_number")
    .eq("document_id", target.document_id as string)
    .gte("chunk_index", minIdx)
    .lte("chunk_index", maxIdx)
    .order("chunk_index", { ascending: true })
  if (errRows) throw errRows
  return (rows ?? []) as ChunkNeighborRow[]
}

export type ChunkWithDocumentMeta = {
  chunkId: string
  documentId: string
  documentName: string
  driveUrl: string
  section: string | null
  pageNumber: number | null
  snippet: string
}

export async function fetchChunksWithDocumentsForFolder(
  chunkIds: string[],
  folderId: string
): Promise<Map<string, ChunkWithDocumentMeta>> {
  const unique = [...new Set(chunkIds)].filter(Boolean)
  const out = new Map<string, ChunkWithDocumentMeta>()
  if (unique.length === 0) return out

  const sb = getServiceRoleClient()
  const { data: chunks, error: errChunks } = await sb
    .from("chunks")
    .select("id, document_id, folder_id, content, section, page_number")
    .in("id", unique)
    .eq("folder_id", folderId)
  if (errChunks) throw errChunks
  if (!chunks?.length) return out

  const docIds = [...new Set(chunks.map((c) => c.document_id as string))]
  const { data: docs, error: errDocs } = await sb
    .from("documents")
    .select("id, name, drive_url")
    .in("id", docIds)
  if (errDocs) throw errDocs
  const docById = new Map(
    (docs ?? []).map((d) => [
      d.id as string,
      { name: d.name as string, drive_url: d.drive_url as string },
    ])
  )

  for (const c of chunks) {
    const doc = docById.get(c.document_id as string)
    if (!doc) continue
    out.set(c.id as string, {
      chunkId: c.id as string,
      documentId: c.document_id as string,
      documentName: doc.name,
      driveUrl: doc.drive_url,
      section: (c.section as string | null) ?? null,
      pageNumber: (c.page_number as number | null) ?? null,
      snippet: (c.content as string) ?? "",
    })
  }
  return out
}
