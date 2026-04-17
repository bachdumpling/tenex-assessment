import { auth } from "@/auth"
import { listDocumentsByFolderId } from "@/lib/db/queries/documents"
import {
  assertUserCanAccessDriveFile,
  listFilesInFolder,
} from "@/lib/google/drive"
import { GoogleReauthRequiredError, getValidAccessToken } from "@/lib/google/tokens"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ folderId: string }> }

/**
 * Compares current Drive `modifiedTime` with DB `indexed_at` for indexed documents.
 * Used to show a re-index banner when files changed in Drive since last ingest.
 */
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
    const token = await getValidAccessToken(session.user.id)
    const [driveFiles, docs] = await Promise.all([
      listFilesInFolder(token, folderId),
      listDocumentsByFolderId(folderId),
    ])

    const byDriveId = new Map(docs.map((d) => [d.drive_file_id, d]))

    let stale = false
    for (const f of driveFiles) {
      const d = byDriveId.get(f.id)
      if (!d || d.status !== "indexed" || !d.indexed_at) continue
      if (new Date(f.modifiedTime) > new Date(d.indexed_at)) {
        stale = true
        break
      }
    }

    return NextResponse.json({ stale })
  } catch (e) {
    if (e instanceof GoogleReauthRequiredError) {
      return NextResponse.json(
        { error: e.message, code: "reauth_required" },
        { status: 401 }
      )
    }
    const message =
      e instanceof Error ? e.message : "Failed to check index status"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
