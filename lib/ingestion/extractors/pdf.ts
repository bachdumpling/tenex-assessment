import "server-only"

import { createRequire } from "node:module"
import { join } from "node:path"

/** pdf-parse@1.x — CommonJS build; avoids pdfjs-dist v4 + DOMMatrix in serverless (Vercel). */
const require = createRequire(join(process.cwd(), "package.json"))
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text?: string }>

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text ?? ""
}
