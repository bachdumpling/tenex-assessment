import "server-only"

import { HttpStatusError, retryWithBackoff } from "@/lib/utils/retry"
import { GoogleGenAI } from "@google/genai"

const MODEL = "gemini-embedding-001"
const EXPECTED_DIM = 3072
const BATCH_SIZE = 50

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.")
  }
  return new GoogleGenAI({ apiKey })
}

/** The Gemini SDK throws plain Errors that embed the HTTP status; extract it when possible. */
function toStatusAwareError(err: unknown): unknown {
  if (err instanceof HttpStatusError) return err
  if (err instanceof Error) {
    const maybeStatus = (err as Error & { status?: unknown }).status
    if (typeof maybeStatus === "number") {
      return new HttpStatusError(maybeStatus, err.message)
    }
    const match = /\b(4\d{2}|5\d{2})\b/.exec(err.message)
    if (match) {
      return new HttpStatusError(Number(match[1]), err.message)
    }
  }
  return err
}

/**
 * Embed document chunks for ingestion. Batches of up to 50 per request.
 * Uses RETRIEVAL_DOCUMENT task type (Gemini embedding API).
 */
export async function embedDocumentChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const ai = getClient()
  const all: number[][] = []

  for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
    const batch = texts.slice(offset, offset + BATCH_SIZE)
    const res = await retryWithBackoff(
      async () => {
        try {
          return await ai.models.embedContent({
            model: MODEL,
            contents: batch,
            config: { taskType: "RETRIEVAL_DOCUMENT" },
          })
        } catch (err) {
          throw toStatusAwareError(err)
        }
      },
      { label: "Gemini embed (document)", timeoutMs: 9000 }
    )
    const embeddings = res.embeddings ?? []
    if (embeddings.length !== batch.length) {
      throw new Error(
        `Embedding batch size mismatch: expected ${batch.length}, got ${embeddings.length}`
      )
    }
    for (const emb of embeddings) {
      const values = emb.values
      if (!values || values.length !== EXPECTED_DIM) {
        throw new Error(
          `Invalid embedding dimension: expected ${EXPECTED_DIM}, got ${values?.length ?? 0}`
        )
      }
      all.push([...values])
    }
  }

  return all
}

/**
 * Embed a single user search query for vector similarity (RETRIEVAL_QUERY).
 */
export async function embedSearchQuery(text: string): Promise<number[]> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error("Search query text is empty.")
  }
  const ai = getClient()
  const res = await retryWithBackoff(
    async () => {
      try {
        return await ai.models.embedContent({
          model: MODEL,
          contents: [trimmed],
          config: { taskType: "RETRIEVAL_QUERY" },
        })
      } catch (err) {
        throw toStatusAwareError(err)
      }
    },
    { label: "Gemini embed (query)", timeoutMs: 9000 }
  )
  const emb = res.embeddings?.[0]
  const values = emb?.values
  if (!values || values.length !== EXPECTED_DIM) {
    throw new Error(
      `Invalid query embedding dimension: expected ${EXPECTED_DIM}, got ${values?.length ?? 0}`
    )
  }
  return [...values]
}
