import "server-only"

import { getServiceRoleClient } from "@/lib/db/supabase"
import type { Citation } from "@/types/citations"

export type MessageRow = {
  id: string
  session_id: string
  role: string
  content: string
  citations: Citation[] | null
  created_at: string
}

export async function listMessagesBySession(sessionId: string): Promise<MessageRow[]> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from("messages")
    .select("id, session_id, role, content, citations, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as MessageRow[]
}

export async function insertMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  citations: Citation[] | null
): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from("messages").insert({
    session_id: sessionId,
    role,
    content,
    citations: citations ?? null,
  })
  if (error) throw error
}

async function insertRoleIfNotDuplicate(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  citations: Citation[] | null
): Promise<void> {
  const rows = await listMessagesBySession(sessionId)
  const last = rows[rows.length - 1]
  if (last?.role === role && last.content === content) return
  await insertMessage(sessionId, role, content, citations)
}

/** Skip insert when the latest row is already this user turn (retry-safe). */
export async function appendUserIfNew(sessionId: string, content: string): Promise<void> {
  await insertRoleIfNotDuplicate(sessionId, "user", content, null)
}

/** Skip insert when the latest assistant matches (retry-safe). */
export async function appendAssistantIfNew(
  sessionId: string,
  content: string,
  citations: Citation[]
): Promise<void> {
  await insertRoleIfNotDuplicate(sessionId, "assistant", content, citations)
}
