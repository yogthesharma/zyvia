"use server"

import {
  mapPreferencesRow,
  PREFERENCES_SELECT,
  toPreferencesPatch,
} from "@/lib/preferences/defaults"
import { parsePreferencesUpdate } from "@/lib/preferences/schema"
import type {
  UserPreferences,
  UserPreferencesRow,
  UserPreferencesUpdate,
} from "@/lib/preferences/types"
import { createClient } from "@/lib/supabase/server"

export type PreferencesActionResult = {
  error?: string
  preferences?: UserPreferences
}

export async function updatePreferences(
  input: UserPreferencesUpdate
): Promise<PreferencesActionResult> {
  try {
    const parsed = parsePreferencesUpdate(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid preferences." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "You must be signed in to save preferences." }
    }

    const update = parsed.data

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) return { error: profileError.message }
    if (!profile) return { error: "Profile not found." }

    if (update.theme !== undefined) {
      const { error } = await supabase
        .from("profiles")
        .update({ theme: update.theme })
        .eq("id", user.id)

      if (error) return { error: error.message }
    }

    const prefsPatch = toPreferencesPatch(update)
    if (Object.keys(prefsPatch).length > 0) {
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          ...prefsPatch,
        },
        { onConflict: "user_id" }
      )

      if (error) return { error: error.message }
    } else {
      // Theme-only updates still need a preferences row for a consistent read.
      const { error } = await supabase.from("user_preferences").upsert(
        { user_id: user.id },
        { onConflict: "user_id", ignoreDuplicates: true }
      )
      if (error) return { error: error.message }
    }

    const { data: row, error: readError } = await supabase
      .from("user_preferences")
      .select(PREFERENCES_SELECT)
      .eq("user_id", user.id)
      .maybeSingle()

    if (readError) return { error: readError.message }

    const theme = update.theme ?? profile.theme

    return {
      preferences: mapPreferencesRow(row as UserPreferencesRow | null, theme),
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save preferences.",
    }
  }
}
