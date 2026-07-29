import type { TeamSummary } from "@/lib/teams/types"
import { DEFAULT_TEAM_ICON } from "@/lib/teams/schema"
import { createClient } from "@/lib/supabase/server"

type TeamRow = {
  id: string
  name: string
  key: string
  icon: string | null
  timezone: string
  created_at: string
  issues?: { count: number }[] | null
  team_members?: { count: number }[] | null
}

function mapTeam(row: TeamRow): TeamSummary {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    icon: row.icon || DEFAULT_TEAM_ICON,
    timezone: row.timezone,
    createdAt: row.created_at,
    visibility: "workspace",
    status: "active",
    memberCount: row.team_members?.[0]?.count ?? 0,
    issueCount: row.issues?.[0]?.count ?? 0,
  }
}

export async function listWorkspaceTeams(
  workspaceId: string
): Promise<TeamSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, name, key, icon, timezone, created_at, issues(count), team_members(count)"
    )
    .eq("workspace_id", workspaceId)
    .order("name")

  if (error) throw new Error(error.message)
  return ((data ?? []) as TeamRow[]).map(mapTeam)
}

/** Soft-fail wrapper for settings pages — unexpected query errors become null. */
export async function listWorkspaceTeamsOrNull(
  workspaceId: string
): Promise<TeamSummary[] | null> {
  try {
    return await listWorkspaceTeams(workspaceId)
  } catch {
    return null
  }
}

export async function getWorkspaceBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
