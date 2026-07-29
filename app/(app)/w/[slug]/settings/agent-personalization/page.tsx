import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentPersonalizationForm } from "@/components/settings/agent-personalization-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getAgentPersonalization,
  listAgentSkills,
} from "@/lib/agent-personalization/queries"

export const metadata: Metadata = { title: "Agent personalization" }

export default async function AgentPersonalizationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()

  try {
    const [settings, skills] = await Promise.all([
      getAgentPersonalization(user.id),
      listAgentSkills(user.id),
    ])

    return (
      <AgentPersonalizationForm
        initialSettings={settings}
        initialSkills={skills}
        workspaceSlug={slug}
      />
    )
  } catch {
    notFound()
  }
}
