import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentSkillForm } from "@/components/settings/create-agent-skill-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getAgentSkill } from "@/lib/agent-personalization/queries"

export const metadata: Metadata = { title: "Edit skill" }

export default async function EditAgentSkillPage({
  params,
}: {
  params: Promise<{ slug: string; skillId: string }>
}) {
  const { slug, skillId } = await params
  const { user } = await requireCompletedOnboarding()

  try {
    const skill = await getAgentSkill(user.id, skillId)
    if (!skill) notFound()
    return <AgentSkillForm workspaceSlug={slug} skill={skill} />
  } catch {
    notFound()
  }
}
