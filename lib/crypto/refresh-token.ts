import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const TAG_LEN = 16

function deriveKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw || raw.length < 16) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be set (at least 16 characters) to store Google refresh tokens."
    )
  }
  return createHash("sha256").update(raw).digest()
}

export function encryptRefreshToken(plain: string): string {
  const key = deriveKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url")
}

export function decryptRefreshToken(payload: string): string {
  const buf = Buffer.from(payload, "base64url")
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Invalid encrypted token payload")
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, deriveKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  )
}
