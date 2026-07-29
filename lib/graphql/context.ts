import type { YogaInitialContext } from "graphql-yoga"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"

import type { GraphQLContext } from "@/lib/graphql/builder"
import {
  hashToken,
  isApiKeySecret,
  mintUserAccessToken,
} from "@/lib/security/api-key"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

function bearerToken(request: Request | undefined) {
  const header = request?.headers.get("authorization")
  if (!header) return null
  const [scheme, token] = header.split(/\s+/, 2)
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

async function contextFromApiKey(secret: string): Promise<GraphQLContext | null> {
  if (!isApiKeySecret(secret)) return null

  const admin = createAdminClient()
  const keyHash = hashToken(secret)
  const { data: keyRow, error } = await admin
    .from("personal_api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle()

  if (error || !keyRow || keyRow.revoked_at) return null

  const { data: authUser, error: userError } =
    await admin.auth.admin.getUserById(keyRow.user_id)
  if (userError || !authUser.user) return null

  // Best-effort last-used stamp; ignore failures.
  void admin
    .from("personal_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)

  const { url, publishableKey } = getSupabaseEnv()
  const accessToken = mintUserAccessToken(
    authUser.user.id,
    authUser.user.email
  )

  const supabase = createSupabaseClient(url, publishableKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const user = {
    id: authUser.user.id,
    email: authUser.user.email,
    app_metadata: authUser.user.app_metadata,
    user_metadata: authUser.user.user_metadata,
    aud: authUser.user.aud,
    created_at: authUser.user.created_at,
  } as User

  return { supabase, user }
}

export async function createContext(
  initial?: YogaInitialContext
): Promise<GraphQLContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) return { supabase, user }

  const token = bearerToken(initial?.request)
  if (token && isApiKeySecret(token)) {
    const fromKey = await contextFromApiKey(token)
    if (fromKey) return fromKey
  }

  return { supabase, user: null }
}
