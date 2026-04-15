import "server-only"

import {
  getChunkWithNeighbors,
  searchChunksBySimilarity,
} from "@/lib/db/queries/chunks"
import { listDocumentsByFolderId } from "@/lib/db/queries/documents"
import { embedSearchQuery } from "@/lib/ingestion/embedder"
import type { Tool } from "@anthropic-ai/sdk/resources/messages"

const CHUNK_PREVIEW = 1200

function previewContent(text: string): string {
  const t = text.trim()
  if (t.length <= CHUNK_PREVIEW) return t
  return `${t.slice(0, CHUNK_PREVIEW)}…`
}

function readQuery(input: unknown): string {
  if (!input || typeof input !== "object") return ""
  const q = (input as { query?: unknown }).query
  return typeof q === "string" ? q.trim() : ""
}

function readLimit(input: unknown, fallback: number): number {
  if (!input || typeof input !== "object") return fallback
  const n = (input as { limit?: unknown }).limit
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(50, Math.floor(n)))
}

function readChunkId(input: unknown): string {
  if (!input || typeof input !== "object") return ""
  const id = (input as { chunk_id?: unknown }).chunk_id
  return typeof id === "string" ? id.trim() : ""
}

export const AGENT_TOOLS: Tool[] = [
  {
    name: "search_documents",
    description:
      "Semantic search over indexed chunks in the current Drive folder. Returns chunk ids, text excerpts, and similarity scores. Use [doc:chunk_id] markers that match returned ids when citing.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query.",
        },
        limit: {
          type: "integer",
          description: "Max chunks to return (1–50). Default 12.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_document_overview",
    description:
      "List all documents in the folder with names, MIME types, and index status. Call when you need to see what files exist before searching.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_chunk_context",
    description:
      "Fetch a chunk plus neighboring chunks (same document) for more context when one snippet is incomplete.",
    input_schema: {
      type: "object",
      properties: {
        chunk_id: {
          type: "string",
          description: "UUID of the chunk from search_documents results.",
        },
      },
      required: ["chunk_id"],
    },
  },
]

export async function executeAgentTool(
  name: string,
  input: unknown,
  folderId: string
): Promise<unknown> {
  switch (name) {
    case "search_documents": {
      const query = readQuery(input)
      if (!query) {
        return { error: "Missing or empty query." }
      }
      const limit = readLimit(input, 12)
      const embedding = await embedSearchQuery(query)
      const rows = await searchChunksBySimilarity({
        folderId,
        queryEmbedding: embedding,
        matchCount: limit,
      })
      return {
        chunks: rows.map((r) => ({
          chunk_id: r.id,
          document_id: r.document_id,
          content: previewContent(r.content),
          section: r.section,
          page_number: r.page_number,
          chunk_index: r.chunk_index,
          distance: r.distance,
        })),
      }
    }
    case "get_document_overview": {
      const docs = await listDocumentsByFolderId(folderId)
      return {
        documents: docs.map((d) => ({
          id: d.id,
          name: d.name,
          mime_type: d.mime_type,
          status: d.status,
          error: d.error,
          indexed_at: d.indexed_at,
        })),
      }
    }
    case "get_chunk_context": {
      const chunkId = readChunkId(input)
      if (!chunkId) {
        return { error: "Missing chunk_id." }
      }
      const neighbors = await getChunkWithNeighbors(chunkId, folderId, 2)
      if (neighbors.length === 0) {
        return { error: "Chunk not found or not in this folder.", chunks: [] }
      }
      return {
        chunks: neighbors.map((c) => ({
          chunk_id: c.id,
          chunk_index: c.chunk_index,
          section: c.section,
          page_number: c.page_number,
          text: previewContent(c.content),
        })),
      }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
