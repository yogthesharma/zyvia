import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LabelsSettingsForm } from "@/components/settings/labels-settings-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getLabelsSettingsOrNull } from "@/lib/labels/queries"
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
  return { title: `Issue labels · ${key.toUpperCase()} · Team` }
}

export default async function TeamIssueLabelsSettingsPage({
  params,
}: PageProps) {
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

  const settings = await getLabelsSettingsOrNull({
    slug,
    userId: user.id,
    kind: "issue",
    teamId: team.id,
  })
  if (!settings) notFound()

  return (
    <LabelsSettingsForm
      initialSettings={settings}
      backHref={`/w/${workspace.slug}/settings/teams/${team.key.toLowerCase()}`}
      backLabel={team.name}
    />
  )
}
