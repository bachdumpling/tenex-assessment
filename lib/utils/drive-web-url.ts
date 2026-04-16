import type { DriveFileListItem } from "@/types/drive"

const FOLDER_MIME = "application/vnd.google-apps.folder"

/** Public Drive web URL for a listed file (no API; works for Docs, PDFs, folders, etc.). */
export function driveWebUrlForListItem(
  file: Pick<DriveFileListItem, "id" | "mimeType">
): string {
  if (file.mimeType === FOLDER_MIME) {
    return `https://drive.google.com/drive/folders/${encodeURIComponent(file.id)}`
  }
  return `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`
}
