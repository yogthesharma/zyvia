import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { DEFAULT_TEAM_ICON, teamLifecycleStatus } from "@/lib/teams/schema"
import type {
  TeamEstimationScale,
  TeamSettings,
  TeamSummary,
  TeamVisibility,
} from "@/lib/teams/types"
import { createClient } from "@/lib/supabase/server"

type TeamRow = {
  id: string
  workspace_id: string
  name: string
  key: string
  icon: string | null
  timezone: string
  description: string | null
  created_at: string
  visibility: TeamVisibility
  estimation_scale: TeamEstimationScale
  allow_zero_estimates: boolean
  extended_estimate_scale: boolean
  count_unestimated_issues: boolean
  parent_team_id: string | null
  triage_enabled: boolean
  email_intake_enabled: boolean
  detailed_issue_history: boolean
  retired_at: string | null
  deleted_at: string | null
  issues?: { count: number }[] | null
  team_members?: { count: number }[] | null
  workflow_states?: { count: number }[] | null
  team_agent_skills?: { count: number }[] | null
}

const TEAM_LIST_SELECT =
  "id, workspace_id, name, key, icon, timezone, description, created_at, visibility, estimation_scale, allow_zero_estimates, extended_estimate_scale, count_unestimated_issues, parent_team_id, triage_enabled, email_intake_enabled, detailed_issue_history, retired_at, deleted_at, issues(count), team_members(count)"

const TEAM_DETAIL_SELECT = `${TEAM_LIST_SELECT}, workflow_states(count), team_agent_skills(count)`

function mapSummary(row: TeamRow): TeamSummary {
  const retiredAt = row.retired_at
  const deletedAt = row.deleted_at
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    icon: row.icon || DEFAULT_TEAM_ICON,
    timezone: row.timezone,
    createdAt: row.created_at,
    visibility: row.visibility ?? "workspace",
    status: teamLifecycleStatus({ retiredAt, deletedAt }),
    memberCount: row.team_members?.[0]?.count ?? 0,
    issueCount: row.issues?.[0]?.count ?? 0,
    retiredAt,
    deletedAt,
  }
}

function mapSettings(
  row: TeamRow,
  membership: {
    role: "owner" | "admin" | "member" | null
    workspaceRole: string | null
  }
): TeamSettings {
  const summary = mapSummary(row)
  const isMember = membership.role != null
  const canManage =
    membership.role === "owner" ||
    membership.role === "admin" ||
    membership.workspaceRole === "owner" ||
    membership.workspaceRole === "admin"

  return {
    ...summary,
    workspaceId: row.workspace_id,
    description: row.description ?? "",
    estimationScale: row.estimation_scale ?? "none",
    allowZeroEstimates: Boolean(row.allow_zero_estimates),
    extendedEstimateScale: Boolean(row.extended_estimate_scale),
    countUnestimatedIssues: row.count_unestimated_issues !== false,
    parentTeamId: row.parent_team_id,
    triageEnabled: Boolean(row.triage_enabled),
    emailIntakeEnabled: Boolean(row.email_intake_enabled),
    detailedIssueHistory: Boolean(row.detailed_issue_history),
    workflowStateCount: row.workflow_states?.[0]?.count ?? 0,
    agentSkillCount: row.team_agent_skills?.[0]?.count ?? 0,
    membershipRole: membership.role,
    isMember,
    canManage,
  }
}

export async function listWorkspaceTeams(
  workspaceId: string,
  options?: { includeDeleted?: boolean }
): Promise<TeamSummary[]> {
  const supabase = await createClient()
  let query = supabase
    .from("teams")
    .select(TEAM_LIST_SELECT)
    .eq("workspace_id", workspaceId)
    .order("name")

  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return ((data ?? []) as TeamRow[]).map(mapSummary)
}

/** Soft-fail wrapper for settings pages — unexpected query errors become null. */
export async function listWorkspaceTeamsOrNull(
  workspaceId: string,
  options?: { includeDeleted?: boolean }
): Promise<TeamSummary[] | null> {
  try {
    return await listWorkspaceTeams(workspaceId, options)
  } catch {
    return null
  }
}

export async function getWorkspaceBySlug(slug: string) {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getTeamSettingsByKey(input: {
  workspaceId: string
  key: string
  userId: string
}): Promise<TeamSettings | null> {
  const key = input.key.trim().toUpperCase()
  if (!/^[A-Z]{2,4}$/.test(key)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_DETAIL_SELECT)
    .eq("workspace_id", input.workspaceId)
    .eq("key", key)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as TeamRow

  const [{ data: membership }, { data: workspaceMembership }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", row.id)
        .eq("user_id", input.userId)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", input.userId)
        .maybeSingle(),
    ])

  return mapSettings(row, {
    role: (membership?.role as TeamSettings["membershipRole"]) ?? null,
    workspaceRole: workspaceMembership?.role ?? null,
  })
}

export async function getTeamSettingsByKeyOrNull(input: {
  workspaceId: string
  key: string
  userId: string
}): Promise<TeamSettings | null> {
  try {
    return await getTeamSettingsByKey(input)
  } catch {
    return null
  }
}
