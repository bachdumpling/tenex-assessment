import "server-only"

import { exportGoogleFile } from "@/lib/google/drive"

export async function extractGoogleDoc(
  accessToken: string,
  fileId: string
): Promise<string> {
  return exportGoogleFile(accessToken, fileId, "text/markdown")
}
