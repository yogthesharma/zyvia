import type { Metadata } from "next"

import { NotificationsForm } from "@/components/settings/notifications-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getEmailNotificationSettings } from "@/lib/notifications/queries"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsSettingsPage() {
  const { user } = await requireCompletedOnboarding()
  const settings = await getEmailNotificationSettings(user.id)

  return (
    <NotificationsForm
      initialSettings={settings}
      email={user.email ?? ""}
    />
  )
}
