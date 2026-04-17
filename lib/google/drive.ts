import "server-only"

import { getValidAccessToken } from "@/lib/google/tokens"
import { HttpStatusError, retryWithBackoff } from "@/lib/utils/retry"
import type { DriveFileListItem, DriveFileMetadata } from "@/types/drive"

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"

type DriveErrorJson = {
  error?: {
    message?: string
    errors?: Array<{ reason?: string }>
    details?: Array<{
      reason?: string
      metadata?: { activationUrl?: string }
    }>
  }
}

async function driveHttpErrorBody(res: Response): Promise<string> {
  const text = await res.text()
  if (res.status !== 403) {
    return text.length > 2000 ? `${text.slice(0, 2000)}…` : text
  }
  try {
    const j = JSON.parse(text) as DriveErrorJson
    const accessNotConfigured =
      j.error?.errors?.some((e) => e.reason === "accessNotConfigured") ||
      j.error?.details?.some((d) => d.reason === "SERVICE_DISABLED")
    if (accessNotConfigured) {
      const activation =
        j.error?.details?.find((d) => d.metadata?.activationUrl)?.metadata
          ?.activationUrl ??
        "https://console.cloud.google.com/apis/library/drive.googleapis.com"
      return (
        `Google Drive API is not enabled for the OAuth client’s Cloud project. ` +
        `Open Google Cloud Console → APIs & Services → Library → enable “Google Drive API”, wait a few minutes, then retry. ${activation}`
      )
    }
    return j.error?.message ?? (text.length > 1500 ? `${text.slice(0, 1500)}…` : text)
  } catch {
    return text.length > 1500 ? `${text.slice(0, 1500)}…` : text
  }
}

function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`
}

/**
 * Wrapper that fetches + retries on 429/5xx + network errors, throwing
 * `HttpStatusError` so non-retriable codes (401/403/404) fail fast.
 */
async function driveFetch(
  url: string,
  accessToken: string,
  label: string
): Promise<Response> {
  return retryWithBackoff(
    async (signal) => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      })
      if (!res.ok) {
        const detail = await driveHttpErrorBody(res)
        throw new HttpStatusError(
          res.status,
          `${label} failed (${res.status}): ${detail}`
        )
      }
      return res
    },
    { label }
  )
}

export async function getFileMetadata(
  accessToken: string,
  fileId: string
): Promise<DriveFileMetadata> {
  const url = new URL(`${DRIVE_FILES}/${encodeURIComponent(fileId)}`)
  url.searchParams.set(
    "fields",
    "id,name,mimeType,modifiedTime,webViewLink,parents,size"
  )

  const res = await driveFetch(url.toString(), accessToken, "Drive files.get")
  const data = (await res.json()) as {
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
    webViewLink?: string
    parents?: string[]
    size?: string
  }
  if (!data.id || !data.name || !data.mimeType || !data.modifiedTime) {
    throw new Error("Drive files.get returned incomplete metadata")
  }
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    modifiedTime: data.modifiedTime,
    webViewLink: data.webViewLink ?? null,
    parents: data.parents ?? [],
    size: data.size ?? null,
  }
}

/** Throws if the user cannot read this Drive file or folder (Drive `files.get`). */
export async function assertUserCanAccessDriveFile(
  userId: string,
  fileId: string
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  await getFileMetadata(accessToken, fileId)
}

/** True if `folderId` appears in the file's parent chain (direct parent only in v3 list). */
export function fileHasParent(metadata: DriveFileMetadata, folderId: string): boolean {
  return metadata.parents.includes(folderId)
}

/**
 * Export a Google Workspace file (Docs / Sheets / Slides) to the given MIME type.
 */
export async function exportGoogleFile(
  accessToken: string,
  fileId: string,
  exportMimeType: string
): Promise<string> {
  const url = new URL(
    `${DRIVE_FILES}/${encodeURIComponent(fileId)}/export`
  )
  url.searchParams.set("mimeType", exportMimeType)

  const res = await driveFetch(url.toString(), accessToken, "Drive export")
  return res.text()
}

/**
 * Download raw file bytes (`alt=media`) for PDF and native text files.
 */
export async function downloadFileMedia(
  accessToken: string,
  fileId: string
): Promise<ArrayBuffer> {
  const url = new URL(`${DRIVE_FILES}/${encodeURIComponent(fileId)}`)
  url.searchParams.set("alt", "media")

  const res = await driveFetch(url.toString(), accessToken, "Drive download")
  return res.arrayBuffer()
}

export { driveFileUrl }

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

    const res = await driveFetch(url.toString(), accessToken, "Drive list")
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
