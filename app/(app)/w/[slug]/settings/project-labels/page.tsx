import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LabelsSettingsForm } from "@/components/settings/labels-settings-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getLabelsSettingsOrNull } from "@/lib/labels/queries"

export const metadata: Metadata = { title: "Project labels" }

export default async function ProjectLabelsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()

  const settings = await getLabelsSettingsOrNull({
    slug,
    userId: user.id,
    kind: "project",
  })
  if (!settings) notFound()

  return <LabelsSettingsForm initialSettings={settings} />
}
