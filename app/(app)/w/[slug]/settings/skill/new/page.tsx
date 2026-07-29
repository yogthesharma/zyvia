import type { Metadata } from "next"

import { AgentSkillForm } from "@/components/settings/create-agent-skill-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"

export const metadata: Metadata = { title: "New skill" }

export default async function NewAgentSkillPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  await requireCompletedOnboarding()

  return <AgentSkillForm workspaceSlug={slug} />
}
