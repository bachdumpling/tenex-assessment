import "server-only"

import { getServiceRoleClient } from "@/lib/db/supabase"
import type { DocumentRow, DocumentStatus } from "@/types/documents"

export async function findDocumentByDriveFileId(
  driveFileId: string
): Promise<DocumentRow | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from("documents")
    .select("*")
    .eq("drive_file_id", driveFileId)
    .maybeSingle()
  if (error) throw error
  return data as DocumentRow | null
}

export type UpsertDocumentInput = {
  folderId: string
  driveFileId: string
  name: string
  mimeType: string
  driveUrl: string
  status: DocumentStatus
  error: string | null
  tokenCount: number | null
  indexedAt: string | null
}

export async function upsertDocumentByDriveFileId(
  input: UpsertDocumentInput
): Promise<DocumentRow> {
  const sb = getServiceRoleClient()
  const row = {
    folder_id: input.folderId,
    drive_file_id: input.driveFileId,
    name: input.name,
    mime_type: input.mimeType,
    drive_url: input.driveUrl,
    status: input.status,
    error: input.error,
    token_count: input.tokenCount,
    indexed_at: input.indexedAt,
  }
  const { data, error } = await sb
    .from("documents")
    .upsert(row, { onConflict: "drive_file_id" })
    .select("*")
    .single()
  if (error) throw error
  return data as DocumentRow
}

export async function updateDocumentById(
  id: string,
  patch: Partial<{
    status: DocumentStatus
    error: string | null
    token_count: number | null
    indexed_at: string | null
    name: string
    mime_type: string
    drive_url: string
  }>
): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from("documents").update(patch).eq("id", id)
  if (error) throw error
}
