import "server-only"

// Import the inner module directly — pdf-parse/index.js has a debug self-test
// that tries to read a non-existent test PDF when bundled by Turbopack.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse") as (
  data: Buffer
) => Promise<{ text?: string }>

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text ?? ""
}
