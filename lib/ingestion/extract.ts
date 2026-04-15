import "server-only"

import { downloadFileMedia } from "@/lib/google/drive"
import { extractGoogleDoc } from "@/lib/ingestion/extractors/google-docs"
import { extractGoogleSheet } from "@/lib/ingestion/extractors/google-sheets"
import { extractGoogleSlides } from "@/lib/ingestion/extractors/google-slides"
import { extractPdfText } from "@/lib/ingestion/extractors/pdf"
import { extractPlaintextFromBuffer } from "@/lib/ingestion/extractors/plaintext"
import { getExtractorKind } from "@/lib/utils/mime-types"

export type ExtractTextResult =
  | { ok: true; text: string }
  | { ok: false; reason: string }

export async function extractDocumentText(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<ExtractTextResult> {
  const kind = getExtractorKind(mimeType)
  try {
    switch (kind) {
      case "google-doc":
        return { ok: true, text: await extractGoogleDoc(accessToken, fileId) }
      case "google-sheet":
        return { ok: true, text: await extractGoogleSheet(accessToken, fileId) }
      case "google-slide":
        return { ok: true, text: await extractGoogleSlides(accessToken, fileId) }
      case "pdf": {
        const buf = await downloadFileMedia(accessToken, fileId)
        const text = await extractPdfText(Buffer.from(buf))
        return { ok: true, text }
      }
      case "plaintext": {
        const buf = await downloadFileMedia(accessToken, fileId)
        return { ok: true, text: extractPlaintextFromBuffer(buf) }
      }
      case "unsupported":
        return {
          ok: false,
          reason: `Unsupported MIME type for indexing: ${mimeType}`,
        }
      default:
        return { ok: false, reason: `Unsupported MIME type: ${mimeType}` }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: message }
  }
}
