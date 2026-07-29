import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentSkillForm } from "@/components/settings/create-agent-skill-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getTeamAgentSkill,
  getTeamAgentSkillsSettingsOrNull,
} from "@/lib/agent-personalization/queries"

type PageProps = {
  params: Promise<{ slug: string; key: string; skillId: string }>
}

export const metadata: Metadata = { title: "Edit skill · Team" }

export default async function EditTeamAgentSkillPage({ params }: PageProps) {
  const { slug, key, skillId } = await params
  const { user } = await requireCompletedOnboarding()

  const settings = await getTeamAgentSkillsSettingsOrNull({
    slug,
    teamKey: key,
    userId: user.id,
  })
  if (!settings) notFound()

  const skill = await getTeamAgentSkill({
    skillId,
    teamId: settings.teamId,
  })
  if (!skill) notFound()

  return (
    <AgentSkillForm
      workspaceSlug={settings.workspaceSlug}
      teamKey={settings.teamKey}
      skill={skill}
      readOnly={!settings.canEdit}
    />
  )
}
