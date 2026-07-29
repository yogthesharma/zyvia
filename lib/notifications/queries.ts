import {
  EMAIL_NOTIFICATION_SELECT,
  mapEmailNotificationRow,
} from "@/lib/notifications/defaults"
import type {
  EmailNotificationSettings,
  EmailNotificationSettingsRow,
} from "@/lib/notifications/types"
import { createClient } from "@/lib/supabase/server"

export async function ensureEmailNotificationSettings(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("email_notification_settings").upsert(
    { user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true }
  )
  if (error) throw new Error(error.message)
}

export async function getEmailNotificationSettings(
  userId: string
): Promise<EmailNotificationSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("email_notification_settings")
    .select(EMAIL_NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data) {
    await ensureEmailNotificationSettings(userId)
    const { data: created, error: readError } = await supabase
      .from("email_notification_settings")
      .select(EMAIL_NOTIFICATION_SELECT)
      .eq("user_id", userId)
      .maybeSingle()

    if (readError) throw new Error(readError.message)
    return mapEmailNotificationRow(
      (created as EmailNotificationSettingsRow | null) ?? null
    )
  }

  return mapEmailNotificationRow(data as EmailNotificationSettingsRow)
}
