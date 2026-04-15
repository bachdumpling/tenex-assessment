import "server-only"

import { ANTHROPIC_MESSAGES_MODEL } from "@/lib/agent/model"
import { listDocumentsByFolderId } from "@/lib/db/queries/documents"
import Anthropic from "@anthropic-ai/sdk"
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages"

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.")
  return new Anthropic({ apiKey: key })
}

/** Short non-tool overview for the folder landing strip (2–4 sentences). */
export async function generateFolderSummaryText(folderId: string): Promise<string> {
  const docs = await listDocumentsByFolderId(folderId)
  const indexed = docs.filter((d) => d.status === "indexed")
  const names =
    indexed.map((d) => d.name).join(", ") || "(no indexed documents yet)"

  const client = getClient()
  const msg = await client.messages.create({
    model: ANTHROPIC_MESSAGES_MODEL,
    max_tokens: 400,
    system:
      "You write very short folder overviews (2–4 sentences) for a knowledge-base sidebar. Be concrete. No markdown headings.",
    messages: [
      {
        role: "user",
        content: `Indexed documents in this Drive folder: ${names}\n\nSummarize what this folder likely contains and how someone might use it when chatting with an AI grounded in these files.`,
      },
    ],
  })

  const text = msg.content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
  const out = text.trim()
  return out || "No summary available yet."
}
