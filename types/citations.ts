/** Resolved citation for UI + persistence on assistant messages. */
export type Citation = {
  index: number
  chunkId: string
  documentId: string
  documentName: string
  driveUrl: string
  section: string | null
  pageNumber: number | null
  snippet: string
}
