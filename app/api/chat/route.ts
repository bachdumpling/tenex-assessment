import { auth } from "@/auth"
import { createAgentNdjsonStream } from "@/lib/agent/index"
import { forwardNdjsonStreamWithCapture } from "@/lib/chat/ndjson-forward"
import { appendAssistantIfNew, appendUserIfNew } from "@/lib/db/queries/messages"
import { getSessionIfOwned } from "@/lib/db/queries/sessions"
import { assertUserCanAccessDriveFile } from "@/lib/google/drive"
import { GoogleReauthRequiredError } from "@/lib/google/tokens"
import type { ChatApiMessage } from "@/types/agent"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_MESSAGES = 40
const MAX_TOTAL_CONTENT_CHARS = 60_000

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object body." }, { status: 400 })
  }

  const folderId = String((body as { folderId?: unknown }).folderId ?? "").trim()
  const sessionIdRaw = String(
    (body as { sessionId?: unknown }).sessionId ?? ""
  ).trim()
  const rawMessages = (body as { messages?: unknown }).messages

  if (!folderId) {
    return NextResponse.json({ error: "folderId is required." }, { status: 400 })
  }
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { error: "messages must be a non-empty array." },
      { status: 400 }
    )
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Too many messages in this turn (max ${MAX_MESSAGES}).` },
      { status: 400 }
    )
  }

  const parsed: ChatApiMessage[] = []
  let totalChars = 0
  for (const m of rawMessages) {
    if (!m || typeof m !== "object") {
      return NextResponse.json({ error: "Invalid message entry." }, { status: 400 })
    }
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (role !== "user" && role !== "assistant") {
      return NextResponse.json({ error: "Invalid message role." }, { status: 400 })
    }
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Message content must be a string." }, { status: 400 })
    }
    const trimmed = content.trim()
    if (!trimmed) {
      return NextResponse.json(
        { error: "Message content must not be empty." },
        { status: 400 }
      )
    }
    totalChars += trimmed.length
    if (totalChars > MAX_TOTAL_CONTENT_CHARS) {
      return NextResponse.json(
        {
          error: `Conversation is too long (max ${MAX_TOTAL_CONTENT_CHARS} characters). Start a new chat.`,
        },
        { status: 400 }
      )
    }
    parsed.push({ role, content: trimmed })
  }

  const last = parsed[parsed.length - 1]
  if (last.role !== "user") {
    return NextResponse.json(
      { error: "The last message must have role user." },
      { status: 400 }
    )
  }

  try {
    await assertUserCanAccessDriveFile(session.user.id, folderId)
  } catch (err) {
    if (err instanceof GoogleReauthRequiredError) {
      return NextResponse.json(
        { error: err.message, code: "reauth_required" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "You cannot access this folder with the linked Google account." },
      { status: 403 }
    )
  }

  let persistId: string | null = null
  if (sessionIdRaw) {
    const owned = await getSessionIfOwned(
      sessionIdRaw,
      session.user.id,
      folderId
    )
    if (!owned) {
      return NextResponse.json({ error: "Invalid sessionId." }, { status: 404 })
    }
    persistId = owned.id
    await appendUserIfNew(persistId, last.content)
  }

  const inner = createAgentNdjsonStream({
    folderId,
    messages: parsed,
    signal: req.signal,
  })

  const stream =
    persistId !== null
      ? forwardNdjsonStreamWithCapture(inner, async (cap) => {
          if (!cap.sawError && cap.assistantText.trim()) {
            await appendAssistantIfNew(persistId, cap.assistantText, cap.citations)
          }
        })
      : inner

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
