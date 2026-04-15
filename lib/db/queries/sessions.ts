import "server-only"

import { getServiceRoleClient } from "@/lib/db/supabase"

export async function ensureSessionForUserFolder(
  userId: string,
  folderId: string
): Promise<{ id: string }> {
  const sb = getServiceRoleClient()
  const { data: existing, error: selErr } = await sb
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing?.id) return { id: existing.id as string }

  const { data, error } = await sb
    .from("sessions")
    .insert({ user_id: userId, folder_id: folderId })
    .select("id")
    .single()
  if (error) throw error
  return { id: data.id as string }
}

export async function getSessionIfOwned(
  sessionId: string,
  userId: string,
  folderId: string
): Promise<{ id: string } | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .maybeSingle()
  if (error) throw error
  if (!data?.id) return null
  return { id: data.id as string }
}
