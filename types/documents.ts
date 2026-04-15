export type DocumentStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "failed"
  | "skipped"

export type DocumentRow = {
  id: string
  folder_id: string
  drive_file_id: string
  name: string
  mime_type: string
  drive_url: string
  status: DocumentStatus
  error: string | null
  token_count: number | null
  indexed_at: string | null
  created_at: string
}
