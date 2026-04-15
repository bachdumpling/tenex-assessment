import "server-only"

import type { DriveFileListItem } from "@/types/drive"

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"

export async function listFilesInFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFileListItem[]> {
  const out: DriveFileListItem[] = []
  let pageToken: string | undefined
  const fields = "nextPageToken,files(id,name,mimeType,modifiedTime)"

  do {
    const url = new URL(DRIVE_FILES)
    url.searchParams.set("q", `'${folderId}' in parents and trashed = false`)
    url.searchParams.set("fields", fields)
    url.searchParams.set("pageSize", "100")
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      throw new Error(`Drive list failed (${res.status}): ${await res.text()}`)
    }
    const data = (await res.json()) as {
      files?: {
        id?: string
        name?: string
        mimeType?: string
        modifiedTime?: string
      }[]
      nextPageToken?: string
    }
    for (const f of data.files ?? []) {
      if (f.id && f.name && f.mimeType && f.modifiedTime) {
        out.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
        })
      }
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return out
}
