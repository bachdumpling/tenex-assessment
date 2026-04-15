import { auth } from "@/auth"
import { getFileMetadata, listFilesInFolder } from "@/lib/google/drive"
import { getValidAccessToken } from "@/lib/google/tokens"
import { NextResponse } from "next/server"

type RouteContext = { params: Promise<{ folderId: string }> }

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
    const token = await getValidAccessToken(session.user.id)
    const files = await listFilesInFolder(token, folderId)

    let folder: { id: string; name: string } | undefined
    try {
      const meta = await getFileMetadata(token, folderId)
      folder = { id: meta.id, name: meta.name }
    } catch {
      /* listing still succeeds without folder label */
    }

    return NextResponse.json(folder ? { files, folder } : { files })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list files"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
