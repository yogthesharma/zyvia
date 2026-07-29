import { headers } from "next/headers"

import { hashToken } from "@/lib/security/api-key"
import type { DeviceSession, PersonalApiKey } from "@/lib/security/types"
import { createClient } from "@/lib/supabase/server"

type SessionRow = {
  id: string
  session_key: string
  user_agent: string | null
  ip: string | null
  last_seen_at: string
  created_at: string
}

type ApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
}

export async function getRequestMeta() {
  const h = await headers()
  const userAgent = h.get("user-agent")
  const forwarded = h.get("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  return { userAgent, ip }
}

export async function resolveCurrentSessionKey(
  userId: string
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session?.access_token) return null

  // Prefer stable session_id claim when present.
  try {
    const payloadPart = session.access_token.split(".")[1]
    if (payloadPart) {
      const json = JSON.parse(
        Buffer.from(payloadPart, "base64url").toString("utf8")
      ) as { session_id?: string; sub?: string }
      if (json.session_id) return hashToken(json.session_id)
      if (json.sub && json.sub !== userId) return null
    }
  } catch {
    // fall through to refresh-token fingerprint
  }

  // Access tokens rotate; refresh tokens stay stable for the auth session.
  if (session.refresh_token) return hashToken(session.refresh_token)

  return null
}

export async function touchCurrentSession(userId: string) {
  const sessionKey = await resolveCurrentSessionKey(userId)
  if (!sessionKey) return null

  const { userAgent, ip } = await getRequestMeta()
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("user_sessions")
    .upsert(
      {
        user_id: userId,
        session_key: sessionKey,
        user_agent: userAgent,
        ip,
        last_seen_at: now,
        revoked_at: null,
      },
      { onConflict: "user_id,session_key" }
    )
    .select("id, session_key, user_agent, ip, last_seen_at, created_at")
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as SessionRow | null
}

export async function listDeviceSessions(
  userId: string
): Promise<DeviceSession[]> {
  // Touch first so the current row exists before we resolve/compare keys.
  await touchCurrentSession(userId)
  const currentKey = await resolveCurrentSessionKey(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_sessions")
    .select("id, session_key, user_agent, ip, last_seen_at, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as SessionRow[]).map((row) => ({
    id: row.id,
    sessionKey: row.session_key,
    userAgent: row.user_agent,
    ip: row.ip,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    isCurrent: Boolean(currentKey && row.session_key === currentKey),
  }))
}

export async function listPersonalApiKeys(
  userId: string
): Promise<PersonalApiKey[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("personal_api_keys")
    .select("id, name, key_prefix, last_used_at, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as ApiKeyRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  }))
}
