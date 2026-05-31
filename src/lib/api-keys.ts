import { createHash } from "crypto"

/**
 * Hash an API key using SHA-256.
 * The raw key is never stored — only the hash.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex")
}

/**
 * Get a display hint for a key (last 8 characters).
 */
export function getKeyHint(rawKey: string): string {
  return rawKey.slice(-8)
}
