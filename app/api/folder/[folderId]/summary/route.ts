import { auth } from "@/auth"
import { generateFolderSummaryText } from "@/lib/agent/folder-summary"
import { assertUserCanAccessDriveFile } from "@/lib/google/drive"
import { GoogleReauthRequiredError } from "@/lib/google/tokens"
import { NextResponse } from "next/server"

type RouteContext = { params: Promise<{ folderId: string }> }

export const runtime = "nodejs"

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
    const summary = await generateFolderSummaryText(folderId)
    return NextResponse.json({ summary })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Summary failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
