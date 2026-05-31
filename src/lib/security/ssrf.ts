import { resolve4, resolve6 } from "dns/promises"
import { isIP } from "net"

const BLOCKED_RANGES_V4 = [
  { prefix: [127, 0, 0, 0], mask: 8 },
  { prefix: [10, 0, 0, 0], mask: 8 },
  { prefix: [172, 16, 0, 0], mask: 12 },
  { prefix: [192, 168, 0, 0], mask: 16 },
  { prefix: [169, 254, 0, 0], mask: 16 },
  { prefix: [0, 0, 0, 0], mask: 8 },
  { prefix: [100, 64, 0, 0], mask: 10 },
  { prefix: [198, 18, 0, 0], mask: 15 },
]

const BLOCKED_RANGES_V6 = [
  { prefix: [0xfe, 0x80, 0, 0, 0, 0, 0, 0], mask: 10 },
  { prefix: [0xfc, 0, 0, 0, 0, 0, 0, 0], mask: 7 },
  { prefix: [0, 0, 0, 0, 0, 0, 0, 1], mask: 128 },
]

const ALLOWED_PORTS = new Set([80, 443])

function ip4ToBytes(ip: string): number[] | null {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return null
  }
  return parts
}

function ip6ToBytes(ip: string): number[] | null {
  const colonCount = (ip.match(/:/g) || []).length
  if (colonCount < 2 || colonCount > 7) return null

  let full = ""
  if (ip.includes("::")) {
    const sides = ip.split("::")
    const left = sides[0] ? sides[0].split(":") : []
    const right = sides[1] ? sides[1].split(":") : []
    const zeros = 8 - left.length - right.length
    full = [...left, ...Array(zeros).fill("0"), ...right].join(":")
  } else {
    full = ip
  }

  const parts = full.split(":")
  if (parts.length !== 8) return null

  const bytes: number[] = []
  for (const part of parts) {
    const val = parseInt(part, 16)
    if (isNaN(val)) return null
    bytes.push((val >> 8) & 0xff, val & 0xff)
  }
  return bytes
}

function ip4InRange(bytes: number[], range: { prefix: number[]; mask: number }): boolean {
  const fullBytes = range.mask >> 3
  const remainingBits = range.mask % 8

  for (let i = 0; i < fullBytes; i++) {
    if (bytes[i] !== range.prefix[i]) return false
  }

  if (remainingBits > 0) {
    const shift = 8 - remainingBits
    if ((bytes[fullBytes] >> shift) !== (range.prefix[fullBytes] >> shift)) {
      return false
    }
  }

  return true
}

function ip6InRange(bytes: number[], range: { prefix: number[]; mask: number }): boolean {
  const fullBytes = range.mask >> 3
  const remainingBits = range.mask % 8

  for (let i = 0; i < fullBytes; i++) {
    if (bytes[i] !== range.prefix[i]) return false
  }

  if (remainingBits > 0) {
    const shift = 8 - remainingBits
    if ((bytes[fullBytes] >> shift) !== (range.prefix[fullBytes] >> shift)) {
      return false
    }
  }

  return true
}

function isBlockedIPv4(ip: string): boolean {
  const bytes = ip4ToBytes(ip)
  if (!bytes) return true
  for (const range of BLOCKED_RANGES_V4) {
    if (ip4InRange(bytes, range)) return true
  }
  return false
}

function isBlockedIPv6(ip: string): boolean {
  const bytes = ip6ToBytes(ip)
  if (!bytes) return true
  for (const range of BLOCKED_RANGES_V6) {
    if (ip6InRange(bytes, range)) return true
  }
  return false
}

async function resolveToIps(hostname: string): Promise<string[]> {
  const ips: string[] = []
  try {
    const v4 = await resolve4(hostname)
    ips.push(...v4)
  } catch { }
  try {
    const v6 = await resolve6(hostname)
    ips.push(...v6)
  } catch { }
  return ips
}

export interface SsrfCheckResult {
  allowed: boolean
  reason?: string
}

export async function checkSsrf(urlString: string): Promise<SsrfCheckResult> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return { allowed: false, reason: "Invalid URL format" }
  }

  if (!ALLOWED_PORTS.has(Number(url.port) || (url.protocol === "https:" ? 443 : 80))) {
    return { allowed: false, reason: `Port ${url.port || (url.protocol === "https:" ? 443 : 80)} is not allowed. Only ports 80 and 443 are permitted.` }
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { allowed: false, reason: `Protocol ${url.protocol} is not allowed. Only HTTP and HTTPS are permitted.` }
  }

  const hostname = url.hostname

  if (isIP(hostname)) {
    if (hostname.includes(":")) {
      if (isBlockedIPv6(hostname)) {
        return { allowed: false, reason: `IP ${hostname} is in a blocked range (private/loopback/link-local)` }
      }
    } else {
      if (isBlockedIPv4(hostname)) {
        return { allowed: false, reason: `IP ${hostname} is in a blocked range (private/loopback/link-local)` }
      }
    }
    return { allowed: true }
  }

  const ips = await resolveToIps(hostname)
  if (ips.length === 0) {
    return { allowed: false, reason: `Could not resolve hostname: ${hostname}` }
  }

  for (const ip of ips) {
    if (ip.includes(":")) {
      if (isBlockedIPv6(ip)) {
        return { allowed: false, reason: `Host ${hostname} resolves to blocked IP: ${ip}` }
      }
    } else {
      if (isBlockedIPv4(ip)) {
        return { allowed: false, reason: `Host ${hostname} resolves to blocked IP: ${ip}` }
      }
    }
  }

  return { allowed: true }
}
