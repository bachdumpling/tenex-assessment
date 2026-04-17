import "server-only"

import { decryptRefreshToken, encryptRefreshToken } from "@/lib/crypto/refresh-token"
import {
  getEncryptedRefreshToken,
  saveEncryptedRefreshToken,
} from "@/lib/db/queries/google-oauth"
import { HttpStatusError, retryWithBackoff } from "@/lib/utils/retry"

type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type: string
}

/**
 * Thrown when Google reports the refresh token is no longer valid (user revoked
 * access, changed password, etc.). Callers should surface this as a 401 so the
 * UI can prompt the user to sign in again.
 */
export class GoogleReauthRequiredError extends Error {
  constructor(message = "Google refresh token is no longer valid; re-auth required.") {
    super(message)
    this.name = "GoogleReauthRequiredError"
  }
}

function isReauthErrorBody(body: string): boolean {
  try {
    const j = JSON.parse(body) as { error?: string; error_description?: string }
    return j.error === "invalid_grant" || j.error === "invalid_token"
  } catch {
    return false
  }
}

/**
 * Single choke point for Google access tokens: decrypt refresh from Supabase,
 * refresh with Google, optionally persist a rotated refresh token.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const enc = await getEncryptedRefreshToken(userId)
  if (!enc) {
    throw new GoogleReauthRequiredError(
      "No Google refresh token on file. Sign out, then sign in with Google again."
    )
  }
  const refreshToken = decryptRefreshToken(enc)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.")
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })

  const json = await retryWithBackoff<GoogleTokenResponse>(
    async (signal) => {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal,
      })
      if (!res.ok) {
        const text = await res.text()
        if (res.status === 400 && isReauthErrorBody(text)) {
          throw new GoogleReauthRequiredError()
        }
        throw new HttpStatusError(
          res.status,
          `Google token refresh failed (${res.status}): ${text}`
        )
      }
      return (await res.json()) as GoogleTokenResponse
    },
    { label: "Google token refresh" }
  )

  if (json.refresh_token) {
    await saveEncryptedRefreshToken(userId, encryptRefreshToken(json.refresh_token))
  }
  return json.access_token
}
