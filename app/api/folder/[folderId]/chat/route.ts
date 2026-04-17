import { auth } from "@/auth"
import { listMessagesBySession } from "@/lib/db/queries/messages"
import {
  createSessionForUserFolder,
  ensureSessionForUserFolder,
} from "@/lib/db/queries/sessions"
import { assertUserCanAccessDriveFile } from "@/lib/google/drive"
import { GoogleReauthRequiredError } from "@/lib/google/tokens"
import { NextResponse } from "next/server"

type RouteContext = { params: Promise<{ folderId: string }> }

/** Creates a new empty session for this folder; client should switch to returned `sessionId`. */
export async function POST(_req: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { folderId } = await context.params
  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 })
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: sessionId } = await createSessionForUserFolder(
      session.user.id,
      folderId
    )
    return NextResponse.json({ sessionId, messages: [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create session"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { folderId } = await context.params
  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 })
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: sessionId } = await ensureSessionForUserFolder(
      session.user.id,
      folderId
    )
    const rows = await listMessagesBySession(sessionId)
    const messages = rows
      .filter((r) => r.role === "user" || r.role === "assistant")
      .map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        content: r.content,
        citations: r.citations,
      }))
    return NextResponse.json({ sessionId, messages })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load chat"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
