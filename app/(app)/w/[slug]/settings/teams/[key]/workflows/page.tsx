import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TeamWorkflowsSettingsForm } from "@/components/settings/team-workflows-settings-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getTeamSettingsByKeyOrNull,
  getWorkspaceBySlug,
} from "@/lib/teams/queries"
import { getTeamWorkflowSettingsOrNull } from "@/lib/workflows/queries"
import { createClient } from "@/lib/supabase/server"

type PageProps = {
  params: Promise<{ slug: string; key: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { key } = await params
  return { title: `Workflows & automations · ${key.toUpperCase()} · Team` }
}

export default async function TeamWorkflowsSettingsPage({ params }: PageProps) {
  const { slug, key } = await params
  const { user } = await requireCompletedOnboarding()
  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) notFound()

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!membership) notFound()

  const team = await getTeamSettingsByKeyOrNull({
    workspaceId: workspace.id,
    key,
    userId: user.id,
  })
  if (!team || team.status === "deleted") notFound()

  const settings = await getTeamWorkflowSettingsOrNull({
    slug,
    userId: user.id,
    teamId: team.id,
  })
  if (!settings) notFound()

  return (
    <TeamWorkflowsSettingsForm
      initialSettings={settings}
      backHref={`/w/${workspace.slug}/settings/teams/${team.key.toLowerCase()}`}
      backLabel={team.name}
    />
  )
}
