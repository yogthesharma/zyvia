import type { Metadata } from "next"

import { SecurityForm } from "@/components/settings/security-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  listDeviceSessions,
  listPersonalApiKeys,
} from "@/lib/security/queries"

export const metadata: Metadata = { title: "Security & access" }

export default async function SecuritySettingsPage() {
  const { user } = await requireCompletedOnboarding()
  const [sessions, keys] = await Promise.all([
    listDeviceSessions(user.id),
    listPersonalApiKeys(user.id),
  ])

  return (
    <SecurityForm initialSessions={sessions} initialKeys={keys} />
  )
}
