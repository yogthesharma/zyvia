import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TeamsSettingsList } from "@/components/settings/teams-settings-list"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getWorkspaceBySlug,
  listWorkspaceTeamsOrNull,
} from "@/lib/teams/queries"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Teams" }

export default async function TeamsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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

  const teams = await listWorkspaceTeamsOrNull(workspace.id)
  if (!teams) notFound()

  return <TeamsSettingsList workspaceSlug={slug} teams={teams} />
}
