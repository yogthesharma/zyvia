import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const API_KEY_PREFIX = "zyvia_"

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function generateApiKeySecret() {
  const raw = randomBytes(24).toString("base64url")
  const secret = `${API_KEY_PREFIX}${raw}`
  const keyPrefix = `${API_KEY_PREFIX}${raw.slice(0, 4)}`
  return { secret, keyPrefix, keyHash: hashToken(secret) }
}

export function isApiKeySecret(value: string) {
  return value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length + 8
}

export function safeEqualHex(a: string, b: string) {
  try {
    const left = Buffer.from(a, "hex")
    const right = Buffer.from(b, "hex")
    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
  } catch {
    return false
  }
}

/** Mint a short-lived HS256 JWT so RLS sees auth.uid() for API-key GraphQL calls. */
export function mintUserAccessToken(userId: string, email?: string | null) {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error("Missing SUPABASE_JWT_SECRET for API key authentication.")
  }

  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64Url(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      email: email ?? undefined,
      iat: now,
      exp: now + 60 * 10,
    })
  )
  const data = `${header}.${payload}`
  const signature = createHmac("sha256", secret).update(data).digest("base64url")
  return `${data}.${signature}`
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}
