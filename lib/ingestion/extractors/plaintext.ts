import "server-only"

export function extractPlaintextFromBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer)
}
