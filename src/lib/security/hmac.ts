import { createHmac, timingSafeEqual } from "crypto"

export interface SignaturePayload {
  body: string
  timestamp: string
}

export function signPayload(body: string, secret: string): string {
  const timestamp = Date.now().toString()
  const payload = `${body}${timestamp}`
  const hmac = createHmac("sha256", secret)
  hmac.update(payload)
  return `${hmac.digest("hex")}:${timestamp}`
}

export function verifySignature(
  body: string,
  signature: string,
  secret: string,
  maxAgeMs: number = 30_000
): boolean {
  const parts = signature.split(":")
  if (parts.length !== 2) return false

  const [sig, timestamp] = parts as [string, string]

  const now = Date.now()
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || now - ts > maxAgeMs) return false

  const payload = `${body}${timestamp}`
  const hmac = createHmac("sha256", secret)
  hmac.update(payload)
  const expected = hmac.digest("hex")

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}
