import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SlasSettingsForm } from "@/components/settings/slas-settings-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getSlaSettings } from "@/lib/sla/queries"

export const metadata: Metadata = { title: "SLAs" }

export default async function SlasSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()

  try {
    const settings = await getSlaSettings(slug, user.id)
    if (!settings) notFound()
    return <SlasSettingsForm initialSettings={settings} />
  } catch {
    notFound()
  }
}
