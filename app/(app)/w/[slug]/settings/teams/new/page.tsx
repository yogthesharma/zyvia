import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CreateTeamForm } from "@/components/settings/create-team-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getWorkspaceBySlug,
  listWorkspaceTeams,
} from "@/lib/teams/queries"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Create team" }

export default async function CreateTeamPage({
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

  const teams = await listWorkspaceTeams(workspace.id)

  return (
    <CreateTeamForm
      workspaceId={workspace.id}
      workspaceSlug={slug}
      existingTeams={teams}
    />
  )
}
