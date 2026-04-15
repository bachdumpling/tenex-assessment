import { encode } from "gpt-tokenizer"

/** Rough structural hint from MIME / extractor path. */
export type ChunkerSource = "markdown-doc" | "slides" | "plain"

export type TextChunk = {
  content: string
  section: string | null
  pageNumber: number | null
  chunkIndex: number
  tokenCount: number
  metadata: Record<string, unknown>
}

type ChunkCore = Omit<TextChunk, "chunkIndex">

const TARGET_TOKENS = 400
const MAX_SECTION_TOKENS = 512
const SENTENCE_OVERLAP_TOKENS = 50

export function countTokens(text: string): number {
  return encode(text).length
}

function splitMarkdownSections(text: string): { section: string; body: string }[] {
  const lines = text.split("\n")
  const sections: { section: string; body: string }[] = []
  let currentTitle = "Document"
  let buf: string[] = []

  const flush = () => {
    const body = buf.join("\n").trim()
    if (body) sections.push({ section: currentTitle, body })
    buf = []
  }

  for (const line of lines) {
    const m = /^(#{1,2})\s+(.+)$/.exec(line)
    if (m) {
      flush()
      currentTitle = m[2].trim()
      continue
    }
    buf.push(line)
  }
  flush()
  if (sections.length === 0) {
    return [{ section: "Document", body: text.trim() }]
  }
  return sections
}

function splitSlidesSections(text: string): { section: string; body: string }[] {
  const parts = text.split(/\n*---SLIDE---\n*/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return [{ section: "Document", body: text.trim() }]
  return parts.map((part, i) => {
    const lines = part.split("\n")
    const first = lines[0]?.trim() || `Slide ${i + 1}`
    const rest = lines.slice(1).join("\n").trim()
    return { section: first, body: rest || part }
  })
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 0)
  return parts.length > 0 ? parts : [text]
}

function chunkLongParagraph(para: string, sectionTitle: string): ChunkCore[] {
  const sentences = splitSentences(para.trim())
  const out: ChunkCore[] = []
  let i = 0

  while (i < sentences.length) {
    const acc: string[] = []
    let tok = 0
    while (i < sentences.length) {
      const s = sentences[i]
      const st = countTokens(s)
      if (tok + st > MAX_SECTION_TOKENS && acc.length > 0) break
      acc.push(s)
      tok += st + (acc.length > 1 ? 1 : 0)
      i++
      if (tok >= TARGET_TOKENS) break
    }
    if (acc.length === 0) {
      acc.push(sentences[i])
      i++
    }
    const content = acc.join(" ").trim()
    if (content) {
      out.push({
        content,
        section: sectionTitle,
        pageNumber: null,
        tokenCount: countTokens(content),
        metadata: {},
      })
    }
    if (i >= sentences.length) break
    let overlap = 0
    let rewind = 0
    while (rewind < acc.length && overlap < SENTENCE_OVERLAP_TOKENS) {
      overlap += countTokens(acc[acc.length - 1 - rewind]) + 1
      rewind++
    }
    i -= Math.max(rewind - 1, 0)
    if (rewind === 0) i = Math.min(i + 1, sentences.length)
  }

  return out
}

function chunkBody(body: string, sectionTitle: string): ChunkCore[] {
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const out: ChunkCore[] = []
  let buf: string[] = []
  let bufTok = 0

  const flush = () => {
    if (buf.length === 0) return
    const content = buf.join("\n\n").trim()
    if (!content) {
      buf = []
      bufTok = 0
      return
    }
    out.push({
      content,
      section: sectionTitle,
      pageNumber: null,
      tokenCount: countTokens(content),
      metadata: {},
    })
    buf = []
    bufTok = 0
  }

  for (const para of paragraphs) {
    const pt = countTokens(para)
    if (pt > MAX_SECTION_TOKENS) {
      flush()
      out.push(...chunkLongParagraph(para, sectionTitle))
      continue
    }
    if (bufTok + pt > MAX_SECTION_TOKENS) flush()
    buf.push(para)
    bufTok += pt
    if (bufTok >= TARGET_TOKENS) flush()
  }
  flush()
  return out
}

function chunkSection(body: string, sectionTitle: string): ChunkCore[] {
  const t = countTokens(body)
  if (t === 0) return []
  if (t <= TARGET_TOKENS * 1.25) {
    return [
      {
        content: body.trim(),
        section: sectionTitle,
        pageNumber: null,
        tokenCount: t,
        metadata: {},
      },
    ]
  }
  if (t <= MAX_SECTION_TOKENS) {
    return [
      {
        content: body.trim(),
        section: sectionTitle,
        pageNumber: null,
        tokenCount: t,
        metadata: {},
      },
    ]
  }
  return chunkBody(body, sectionTitle)
}

/**
 * Hierarchical chunking: headings / slides first, then paragraphs, then sentences + overlap.
 */
export function chunkDocumentText(text: string, source: ChunkerSource): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  let sections: { section: string; body: string }[]
  if (source === "markdown-doc") {
    sections = splitMarkdownSections(normalized)
  } else if (source === "slides") {
    sections = splitSlidesSections(normalized)
  } else {
    sections = [{ section: "Document", body: normalized }]
  }

  const cores: ChunkCore[] = []
  for (const { section, body } of sections) {
    if (!body.trim()) continue
    cores.push(...chunkSection(body, section))
  }

  return cores.map((c, i) => ({ ...c, chunkIndex: i }))
}

export function chunkerSourceForMime(mimeType: string): ChunkerSource {
  if (mimeType === "application/vnd.google-apps.document") return "markdown-doc"
  if (mimeType === "application/vnd.google-apps.presentation") return "slides"
  return "plain"
}
