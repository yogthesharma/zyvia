import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TeamSettingsHub } from "@/components/settings/team-settings-hub"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getTeamSettingsByKeyOrNull,
  getWorkspaceBySlug,
} from "@/lib/teams/queries"
import { createClient } from "@/lib/supabase/server"

type PageProps = {
  params: Promise<{ slug: string; key: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { key } = await params
  return { title: `${key.toUpperCase()} · Team` }
}

export default async function TeamSettingsPage({ params }: PageProps) {
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
  if (!team) notFound()

  return <TeamSettingsHub workspaceSlug={slug} team={team} />
}
