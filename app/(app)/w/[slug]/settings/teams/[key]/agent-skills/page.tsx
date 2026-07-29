import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TeamAgentSkillsSettings } from "@/components/settings/team-agent-skills-settings"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getTeamAgentSkillsSettingsOrNull } from "@/lib/agent-personalization/queries"

type PageProps = {
  params: Promise<{ slug: string; key: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { key } = await params
  return { title: `Agent skills · ${key.toUpperCase()} · Team` }
}

export default async function TeamAgentSkillsPage({ params }: PageProps) {
  const { slug, key } = await params
  const { user } = await requireCompletedOnboarding()

  const settings = await getTeamAgentSkillsSettingsOrNull({
    slug,
    teamKey: key,
    userId: user.id,
  })
  if (!settings) notFound()

  return <TeamAgentSkillsSettings initialSettings={settings} />
}
