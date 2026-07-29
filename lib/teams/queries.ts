import type { TeamSummary } from "@/lib/teams/types"
import { createClient } from "@/lib/supabase/server"

type TeamRow = {
  id: string
  name: string
  key: string
  icon: string | null
  timezone: string
  created_at: string
}

function mapTeam(row: TeamRow): TeamSummary {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    icon: row.icon,
    timezone: row.timezone,
    createdAt: row.created_at,
  }
}

export async function listWorkspaceTeams(
  workspaceId: string
): Promise<TeamSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, key, icon, timezone, created_at")
    .eq("workspace_id", workspaceId)
    .order("name")

  if (error) throw new Error(error.message)
  return ((data ?? []) as TeamRow[]).map(mapTeam)
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
