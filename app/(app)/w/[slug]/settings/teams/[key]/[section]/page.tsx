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
  general: {
    title: "General",
    description: "Name, identifier, timezone, estimates, and other settings.",
  },
  members: {
    title: "Members",
    description: "Manage and invite team members.",
  },
  slack: {
    title: "Slack notifications",
    description: "Configure notifications for this team.",
  },
  labels: {
    title: "Issue labels",
    description: "Manage issue labels for this team.",
  },
  templates: {
    title: "Templates",
    description: "Manage templates for issues, documents, and projects.",
  },
  recurring: {
    title: "Recurring issues",
    description: "Manage automatic issue creation on a schedule.",
  },
  statuses: {
    title: "Issue statuses",
    description: "Edit workflow statuses and categories.",
  },
  workflows: {
    title: "Workflows & automations",
    description: "Automations for this team's issues and git workflows.",
  },
  triage: {
    title: "Triage",
    description: "Streamline requests from the rest of your organization.",
  },
  cycles: {
    title: "Cycles",
    description: "Focus your team's work over short, time-boxed windows.",
  },
  agents: {
    title: "Team agents",
    description: "Guidance for how agents should operate within this team.",
  },
  "agent-skills": {
    title: "Agent skills",
    description: "Agent skills shared with this team.",
  },
  "project-updates": {
    title: "Project updates",
    description: "Automatically generate updates from recent activity.",
  },
  "thread-summaries": {
    title: "Resolved thread summaries",
    description: "Automatically generate summaries for resolved threads.",
  },
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
