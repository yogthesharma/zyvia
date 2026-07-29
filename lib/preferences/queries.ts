import {
  mapPreferencesRow,
  PREFERENCES_SELECT,
} from "@/lib/preferences/defaults"
import { isDefaultHomeView } from "@/lib/preferences/schema"
import type {
  DefaultHomeView,
  UserPreferences,
  UserPreferencesRow,
} from "@/lib/preferences/types"
import { createClient } from "@/lib/supabase/server"

export function workspaceHomePath(
  slug: string,
  view: DefaultHomeView = "issues"
) {
  const safeView = isDefaultHomeView(view) ? view : "issues"
  return `/w/${slug}/${safeView}`
}

export async function ensureUserPreferences(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_preferences").upsert(
    { user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true }
  )
  if (error) throw new Error(error.message)
}

export async function getUserPreferences(
  userId: string,
  theme: UserPreferences["theme"] = "dark"
): Promise<UserPreferences> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_preferences")
    .select(PREFERENCES_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data) {
    await ensureUserPreferences(userId)
    return mapPreferencesRow(null, theme)
  }

  return mapPreferencesRow(data as UserPreferencesRow, theme)
}

export async function getWorkspaceHomePath(userId: string, slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_preferences")
    .select("default_home_view")
    .eq("user_id", userId)
    .maybeSingle()

  const view = isDefaultHomeView(data?.default_home_view)
    ? data.default_home_view
    : "issues"

  return workspaceHomePath(slug, view)
}
