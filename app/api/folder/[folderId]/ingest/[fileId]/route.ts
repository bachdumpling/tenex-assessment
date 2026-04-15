import { auth } from "@/auth"
import { runFolderFileIngest } from "@/lib/ingestion/pipeline"
import { NextResponse } from "next/server"

type RouteContext = { params: Promise<{ folderId: string; fileId: string }> }

export async function POST(_req: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { folderId, fileId } = await context.params
  if (!folderId || !fileId) {
    return NextResponse.json({ error: "Missing folderId or fileId" }, { status: 400 })
  }

  const result = await runFolderFileIngest({
    userId: session.user.id,
    folderId,
    fileId,
  })

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      status: result.status,
      documentId: result.documentId,
      error: result.error,
    })
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    documentId: result.documentId,
    detail: result.detail,
  })
}
