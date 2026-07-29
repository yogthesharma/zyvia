"use server"

import {
  generateApiKeySecret,
} from "@/lib/security/api-key"
import { parseApiKeyName } from "@/lib/security/schema"
import {
  listDeviceSessions,
  listPersonalApiKeys,
  touchCurrentSession,
} from "@/lib/security/queries"
import type { SecurityActionResult } from "@/lib/security/types"
import { createClient } from "@/lib/supabase/server"

type AuthOk = {
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

async function requireUserId(): Promise<AuthOk | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { error: "You must be signed in." }
  return { userId: user.id, supabase }
}

function isAuthError(
  auth: AuthOk | { error: string }
): auth is { error: string } {
  return "error" in auth
}

export async function loadSecuritySettings(): Promise<SecurityActionResult> {
  try {
    const auth = await requireUserId()
    if (isAuthError(auth)) return { error: auth.error }

    const [sessions, keys] = await Promise.all([
      listDeviceSessions(auth.userId),
      listPersonalApiKeys(auth.userId),
    ])
    return { sessions, keys }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not load security settings.",
    }
  }
}

export async function revokeOtherSessions(): Promise<SecurityActionResult> {
  try {
    const auth = await requireUserId()
    if (isAuthError(auth)) return { error: auth.error }
    const { userId, supabase } = auth

    const current = await touchCurrentSession(userId)
    if (!current?.session_key) {
      return {
        error: "Could not identify this device session. Try refreshing the page.",
      }
    }

    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    })
    if (signOutError) return { error: signOutError.message }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from("user_sessions")
      .update({ revoked_at: now })
      .eq("user_id", userId)
      .is("revoked_at", null)
      .neq("session_key", current.session_key)

    if (error) return { error: error.message }

    const sessions = await listDeviceSessions(userId)
    return { sessions }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not revoke other sessions.",
    }
  }
}

export async function createApiKey(nameInput: string): Promise<SecurityActionResult> {
  try {
    const parsed = parseApiKeyName(nameInput)
    if (parsed.error || !parsed.name) {
      return { error: parsed.error ?? "Enter a name for this API key." }
    }

    const auth = await requireUserId()
    if (isAuthError(auth)) return { error: auth.error }
    const { userId, supabase } = auth

    const { secret, keyPrefix, keyHash } = generateApiKeySecret()
    const { data, error } = await supabase
      .from("personal_api_keys")
      .insert({
        user_id: userId,
        name: parsed.name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select("id, name, key_prefix, last_used_at, created_at")
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: "Could not create API key." }

    const keys = await listPersonalApiKeys(userId)
    return {
      secret,
      key: {
        id: data.id,
        name: data.name,
        keyPrefix: data.key_prefix,
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
      },
      keys,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create API key.",
    }
  }
}

export async function revokeApiKey(keyId: string): Promise<SecurityActionResult> {
  try {
    if (typeof keyId !== "string" || !keyId) {
      return { error: "Invalid API key." }
    }
    // UUID shape guard — avoids noisy Postgres errors on malformed ids.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        keyId
      )
    ) {
      return { error: "Invalid API key." }
    }

    const auth = await requireUserId()
    if (isAuthError(auth)) return { error: auth.error }
    const { userId, supabase } = auth

    const { data: existing, error: readError } = await supabase
      .from("personal_api_keys")
      .select("id, revoked_at")
      .eq("id", keyId)
      .eq("user_id", userId)
      .maybeSingle()

    if (readError) return { error: readError.message }
    if (!existing) return { error: "API key not found." }
    if (existing.revoked_at) {
      const keys = await listPersonalApiKeys(userId)
      return { keys }
    }

    const { error } = await supabase
      .from("personal_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("user_id", userId)

    if (error) return { error: error.message }

    const keys = await listPersonalApiKeys(userId)
    return { keys }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not revoke API key.",
    }
  }
}
