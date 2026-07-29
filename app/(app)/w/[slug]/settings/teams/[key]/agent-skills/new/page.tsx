import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentSkillForm } from "@/components/settings/create-agent-skill-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getTeamAgentSkillsSettingsOrNull } from "@/lib/agent-personalization/queries"

type PageProps = {
  params: Promise<{ slug: string; key: string }>
}

export const metadata: Metadata = { title: "New skill · Team" }

export default async function NewTeamAgentSkillPage({ params }: PageProps) {
  const { slug, key } = await params
  const { user } = await requireCompletedOnboarding()

  const settings = await getTeamAgentSkillsSettingsOrNull({
    slug,
    teamKey: key,
    userId: user.id,
  })
  if (!settings) notFound()
  if (!settings.canEdit) notFound()

  return (
    <AgentSkillForm
      workspaceSlug={settings.workspaceSlug}
      teamKey={settings.teamKey}
    />
  )
}
