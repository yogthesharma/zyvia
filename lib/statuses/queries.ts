import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import {
  DEFAULT_STATUS_COLOR,
  isIssueStatusCategory,
  isProjectStatusCategory,
  isStatusKind,
  normalizeStatusColor,
} from "@/lib/statuses/schema"
import type {
  StatusCategory,
  StatusesSettings,
  StatusKind,
  StatusRecord,
} from "@/lib/statuses/types"
import type { WorkspaceRole } from "@/lib/workspace/types"
import { createClient } from "@/lib/supabase/server"

type IssueStatusRow = {
  id: string
  team_id: string
  name: string
  description: string | null
  category: string
  position: number
  is_default: boolean
  color: string | null
  issues?: { count: number }[] | null
}

type ProjectStatusRow = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  category: string
  position: number
  is_default: boolean
  color: string
}

function mapIssueRow(row: IssueStatusRow): StatusRecord | null {
  if (!isIssueStatusCategory(row.category)) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category,
    position: row.position ?? 0,
    isDefault: Boolean(row.is_default),
    color: normalizeStatusColor(row.color ?? "") ?? DEFAULT_STATUS_COLOR,
    usageCount: row.issues?.[0]?.count ?? 0,
  }
}

function mapProjectRow(row: ProjectStatusRow): StatusRecord | null {
  if (!isProjectStatusCategory(row.category)) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category,
    position: row.position ?? 0,
    isDefault: Boolean(row.is_default),
    color: normalizeStatusColor(row.color) ?? DEFAULT_STATUS_COLOR,
    usageCount: 0,
  }
}

function sortStatuses(a: StatusRecord, b: StatusRecord) {
  if (a.position !== b.position) return a.position - b.position
  return a.name.localeCompare(b.name)
}

export async function getStatusesSettings(input: {
  slug: string
  userId: string
  kind: StatusKind
  teamId?: string | null
}): Promise<StatusesSettings | null> {
  if (!isValidWorkspaceSlug(input.slug)) return null
  if (!isStatusKind(input.kind)) return null
  if (input.kind === "project" && input.teamId) return null
  if (input.kind === "issue" && !input.teamId) return null

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("slug", input.slug)
    .maybeSingle()

  if (workspaceError) throw new Error(workspaceError.message)
  if (!workspace) return null

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", input.userId)
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership) return null

  const role = membership.role as WorkspaceRole
  const deletionLocked = Boolean(workspace.deletion_scheduled_at)

  let teamKey: string | null = null
  let teamName: string | null = null
  let teamCanManage = false

  if (input.kind === "issue") {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, key, name, workspace_id, deleted_at")
      .eq("id", input.teamId!)
      .eq("workspace_id", workspace.id)
      .maybeSingle()

    if (teamError) throw new Error(teamError.message)
    if (!team || team.deleted_at) return null

    teamKey = team.key
    teamName = team.name

    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", input.userId)
      .maybeSingle()

    const teamRole = teamMember?.role as "owner" | "admin" | "member" | undefined
    teamCanManage = teamRole === "owner" || teamRole === "admin"

    const { data: rows, error } = await supabase
      .from("workflow_states")
      .select(
        "id, team_id, name, description, category, position, is_default, color, issues(count)"
      )
      .eq("team_id", team.id)
      .order("position", { ascending: true })

    if (error) throw new Error(error.message)

    const statuses = ((rows ?? []) as IssueStatusRow[])
      .map(mapIssueRow)
      .filter((row): row is StatusRecord => row != null)
      .sort(sortStatuses)

    const canEdit =
      !deletionLocked &&
      (role === "owner" || role === "admin" || teamCanManage)

    return {
      kind: "issue",
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      teamId: team.id,
      teamKey,
      teamName,
      canEdit,
      deletionLocked,
      statuses,
    }
  }

  const { data: rows, error } = await supabase
    .from("project_statuses")
    .select(
      "id, workspace_id, name, description, category, position, is_default, color"
    )
    .eq("workspace_id", workspace.id)
    .order("position", { ascending: true })

  if (error) throw new Error(error.message)

  const statuses = ((rows ?? []) as ProjectStatusRow[])
    .map(mapProjectRow)
    .filter((row): row is StatusRecord => row != null)
    .sort(sortStatuses)

  const canEdit =
    !deletionLocked && (role === "owner" || role === "admin")

  return {
    kind: "project",
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    teamId: null,
    teamKey: null,
    teamName: null,
    canEdit,
    deletionLocked,
    statuses,
  }
}

export async function getStatusesSettingsOrNull(input: {
  slug: string
  userId: string
  kind: StatusKind
  teamId?: string | null
}): Promise<StatusesSettings | null> {
  try {
    return await getStatusesSettings(input)
  } catch {
    return null
  }
}

export function statusesInCategory(
  statuses: StatusRecord[],
  category: StatusCategory
) {
  return statuses
    .filter((status) => status.category === category)
    .sort(sortStatuses)
}
