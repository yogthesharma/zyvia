"use server"

import {
  EMAIL_NOTIFICATION_SELECT,
  mapEmailNotificationRow,
  toEmailNotificationPatch,
} from "@/lib/notifications/defaults"
import { parseEmailNotificationUpdate } from "@/lib/notifications/schema"
import type {
  EmailNotificationSettingsRow,
  EmailNotificationSettingsUpdate,
  NotificationActionResult,
} from "@/lib/notifications/types"
import { createClient } from "@/lib/supabase/server"

export async function updateEmailNotificationSettings(
  input: EmailNotificationSettingsUpdate
): Promise<NotificationActionResult> {
  try {
    const parsed = parseEmailNotificationUpdate(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid notification settings." }
    }

    const patch = toEmailNotificationPatch(parsed.data)
    if (Object.keys(patch).length === 0) {
      return { error: "No notification changes provided." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "You must be signed in to save notification settings." }
    }

    // Enabling activity email requires an address on the account.
    if (parsed.data.enabled === true) {
      if (!user.email) {
        return {
          error:
            "Add an email address to your account before enabling email notifications.",
        }
      }
    }

    const { error } = await supabase.from("email_notification_settings").upsert(
      {
        user_id: user.id,
        ...patch,
      },
      { onConflict: "user_id" }
    )

    if (error) return { error: error.message }

    const { data: row, error: readError } = await supabase
      .from("email_notification_settings")
      .select(EMAIL_NOTIFICATION_SELECT)
      .eq("user_id", user.id)
      .maybeSingle()

    if (readError) return { error: readError.message }
    if (!row) {
      return { error: "Could not load saved notification settings." }
    }

    return {
      settings: mapEmailNotificationRow(row as EmailNotificationSettingsRow),
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save notification settings.",
    }
  }
}
