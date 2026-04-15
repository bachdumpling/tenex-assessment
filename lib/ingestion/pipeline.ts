import "server-only"

import {
  deleteChunksForDocument,
  insertChunksForDocument,
} from "@/lib/db/queries/chunks"
import {
  findDocumentByDriveFileId,
  upsertDocumentByDriveFileId,
  updateDocumentById,
} from "@/lib/db/queries/documents"
import { driveFileUrl, fileHasParent, getFileMetadata } from "@/lib/google/drive"
import { getValidAccessToken } from "@/lib/google/tokens"
import { chunkDocumentText, chunkerSourceForMime } from "@/lib/ingestion/chunker"
import { embedDocumentChunks } from "@/lib/ingestion/embedder"
import { extractDocumentText } from "@/lib/ingestion/extract"
import { getExtractorKind, getUnsupportedIngestMessage } from "@/lib/utils/mime-types"

const MAX_FILE_BYTES = 28 * 1024 * 1024
const MAX_EXTRACTED_CHARS = 260_000
const MAX_CHUNKS = 160

export type IngestPipelineResult =
  | {
      ok: true
      documentId: string
      status: "indexed" | "skipped"
      detail?: string
    }
  | { ok: false; documentId?: string; status: "failed"; error: string }

function parseDriveTime(iso: string): number {
  return new Date(iso).getTime()
}

export async function runFolderFileIngest(params: {
  userId: string
  folderId: string
  fileId: string
}): Promise<IngestPipelineResult> {
  const { userId, folderId, fileId } = params
  let documentId: string | undefined

  try {
    const accessToken = await getValidAccessToken(userId)
    const meta = await getFileMetadata(accessToken, fileId)

    if (!fileHasParent(meta, folderId)) {
      return { ok: false, status: "failed", error: "File is not in this folder." }
    }

    if (meta.size) {
      const n = Number(meta.size)
      if (Number.isFinite(n) && n > MAX_FILE_BYTES) {
        return {
          ok: false,
          status: "failed",
          error: `File too large to index within serverless limits (${meta.size} bytes).`,
        }
      }
    }

    const driveUrl = meta.webViewLink ?? driveFileUrl(meta.id)
    const kind = getExtractorKind(meta.mimeType)

    if (kind === "unsupported") {
      const skipMessage = getUnsupportedIngestMessage(meta.mimeType)
      const doc = await upsertDocumentByDriveFileId({
        folderId,
        driveFileId: fileId,
        name: meta.name,
        mimeType: meta.mimeType,
        driveUrl,
        status: "skipped",
        error: skipMessage,
        tokenCount: null,
        indexedAt: null,
      })
      return {
        ok: true,
        documentId: doc.id,
        status: "skipped",
        detail: doc.error ?? undefined,
      }
    }

    const existing = await findDocumentByDriveFileId(fileId)
    if (
      existing?.status === "indexed" &&
      existing.indexed_at &&
      parseDriveTime(meta.modifiedTime) <= parseDriveTime(existing.indexed_at)
    ) {
      return {
        ok: true,
        documentId: existing.id,
        status: "indexed",
        detail: "Already indexed; file unchanged.",
      }
    }

    const processing = await upsertDocumentByDriveFileId({
      folderId,
      driveFileId: fileId,
      name: meta.name,
      mimeType: meta.mimeType,
      driveUrl,
      status: "processing",
      error: null,
      tokenCount: null,
      indexedAt: null,
    })
    documentId = processing.id

    const extracted = await extractDocumentText(
      accessToken,
      fileId,
      meta.mimeType
    )
    if (!extracted.ok) {
      await updateDocumentById(processing.id, {
        status: "failed",
        error: extracted.reason,
      })
      return { ok: false, documentId: processing.id, status: "failed", error: extracted.reason }
    }

    const text = extracted.text
    if (text.length > MAX_EXTRACTED_CHARS) {
      const msg = `Extracted text too large (${text.length} chars) for serverless indexing.`
      await updateDocumentById(processing.id, { status: "failed", error: msg })
      return { ok: false, documentId: processing.id, status: "failed", error: msg }
    }

    const chunks = chunkDocumentText(text, chunkerSourceForMime(meta.mimeType))
    if (chunks.length === 0) {
      await updateDocumentById(processing.id, {
        status: "failed",
        error: "No indexable text extracted from file.",
      })
      return {
        ok: false,
        documentId: processing.id,
        status: "failed",
        error: "No indexable text extracted from file.",
      }
    }
    if (chunks.length > MAX_CHUNKS) {
      const msg = `Too many chunks (${chunks.length}); file exceeds serverless indexing limits.`
      await updateDocumentById(processing.id, { status: "failed", error: msg })
      return { ok: false, documentId: processing.id, status: "failed", error: msg }
    }

    const texts = chunks.map((c) => c.content)
    const vectors = await embedDocumentChunks(texts)

    await deleteChunksForDocument(processing.id)
    await insertChunksForDocument(processing.id, folderId, chunks, vectors)

    const totalTokens = chunks.reduce((s, c) => s + c.tokenCount, 0)
    const now = new Date().toISOString()
    await updateDocumentById(processing.id, {
      status: "indexed",
      error: null,
      token_count: totalTokens,
      indexed_at: now,
    })

    return { ok: true, documentId: processing.id, status: "indexed" }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (documentId) {
      await updateDocumentById(documentId, { status: "failed", error: message })
    }
    return { ok: false, documentId, status: "failed", error: message }
  }
}
