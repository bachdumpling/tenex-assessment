import "server-only"

import { exportGoogleFile } from "@/lib/google/drive"

/**
 * Export as plain text; normalize form-feed slide breaks to a stable delimiter
 * for the chunker.
 */
export async function extractGoogleSlides(
  accessToken: string,
  fileId: string
): Promise<string> {
  const raw = await exportGoogleFile(accessToken, fileId, "text/plain")
  return raw.split("\f").join("\n\n---SLIDE---\n\n")
}
