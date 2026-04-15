import { auth } from "@/auth"
import { listFilesInFolder } from "@/lib/google/drive"
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
    return NextResponse.json({ files })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list files"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
