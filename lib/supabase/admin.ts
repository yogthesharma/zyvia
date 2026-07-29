import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env"

/**
 * Service-role client — bypasses RLS. Server-only (Route Handlers / Actions).
 * Never import this into Client Components.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv()
  return createSupabaseClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
