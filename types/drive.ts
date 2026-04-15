/** Drive API v3 file list entry (subset used by the app). */
export type DriveFileListItem = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

/** Metadata from `files.get` for ingest / parent checks. */
export type DriveFileMetadata = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string | null
  parents: string[]
  /** Drive size string (bytes); absent for some native Google files. */
  size: string | null
}
