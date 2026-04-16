import "server-only"

import { createRequire } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { PDFParse } from "pdf-parse"

const require = createRequire(join(process.cwd(), "package.json"))
const pdfWorkerHref = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
).href
PDFParse.setWorker(pdfWorkerHref)

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result.text ?? ""
  } finally {
    await parser.destroy()
  }
}
