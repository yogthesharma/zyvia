import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ComingSoonPage } from "@/components/app/coming-soon"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import {
  getTeamSettingsByKeyOrNull,
  getWorkspaceBySlug,
} from "@/lib/teams/queries"
import { createClient } from "@/lib/supabase/server"

const SECTIONS: Record<string, { title: string; description: string }> = {
  slack: {
    title: "Slack notifications",
    description: "Configure notifications for this team.",
  },
  templates: {
    title: "Templates",
    description: "Manage templates for issues, documents, and projects.",
  },
  recurring: {
    title: "Recurring issues",
    description: "Manage automatic issue creation on a schedule.",
  },
  workflows: {
    title: "Workflows & automations",
    description: "Automations for this team's issues and git workflows.",
  },
  cycles: {
    title: "Cycles",
    description: "Focus your team's work over short, time-boxed windows.",
  },
  "project-updates": {
    title: "Project updates",
    description: "Automatically generate updates from recent activity.",
  },
  // "thread-summaries": {
  //   title: "Resolved thread summaries",
  //   description: "Automatically generate summaries for resolved threads.",
  // },
}

type PageProps = {
  params: Promise<{ slug: string; key: string; section: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { section } = await params
  const meta = SECTIONS[section]
  return { title: meta ? `${meta.title} · Team` : "Team settings" }
}

export default async function TeamSettingsSectionPage({ params }: PageProps) {
  const { slug, key, section } = await params
  const meta = SECTIONS[section]
  if (!meta) notFound()

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

  return (
    <ComingSoonPage
      title={`${team.name} · ${meta.title}`}
      description={meta.description}
    />
  )
}
