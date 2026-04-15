import { getServiceRoleClient } from "@/lib/db/supabase"

export async function saveEncryptedRefreshToken(
  userId: string,
  encryptedRefreshToken: string
): Promise<void> {
  const sb = getServiceRoleClient()
  const { error } = await sb.from("google_oauth_tokens").upsert(
    {
      user_id: userId,
      encrypted_refresh_token: encryptedRefreshToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) throw error
}

export async function getEncryptedRefreshToken(
  userId: string
): Promise<string | null> {
  const sb = getServiceRoleClient()
  const { data, error } = await sb
    .from("google_oauth_tokens")
    .select("encrypted_refresh_token")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data?.encrypted_refresh_token ?? null
}
