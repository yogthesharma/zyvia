import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { isLabelKind } from "@/lib/labels/schema"
import type {
  LabelKind,
  LabelRecord,
  LabelRow,
  LabelsSettings,
} from "@/lib/labels/types"
import type { WorkspaceRole } from "@/lib/workspace/types"
import { createClient } from "@/lib/supabase/server"

const LABEL_SELECT = `
  id,
  workspace_id,
  team_id,
  kind,
  name,
  description,
  color,
  is_group,
  parent_id,
  position,
  archived_at,
  last_applied_at,
  created_at,
  teams ( key, name ),
  issue_labels ( count )
`

function embedTeam(row: LabelRow) {
  if (!row.teams) return null
  return Array.isArray(row.teams) ? (row.teams[0] ?? null) : row.teams
}

export function mapLabelRow(row: LabelRow): LabelRecord {
  const team = embedTeam(row)
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    teamId: row.team_id,
    teamKey: team?.key ?? null,
    teamName: team?.name ?? null,
    kind: isLabelKind(row.kind) ? row.kind : "issue",
    name: row.name,
    description: row.description ?? "",
    color: row.color,
    isGroup: Boolean(row.is_group),
    parentId: row.parent_id,
    position: row.position ?? 0,
    archivedAt: row.archived_at,
    lastAppliedAt: row.last_applied_at,
    createdAt: row.created_at,
    usageCount: row.is_group
      ? 0
      : row.kind === "project"
        ? 0
        : (row.issue_labels?.[0]?.count ?? 0),
  }
}

function sortLabels(a: LabelRecord, b: LabelRecord) {
  if (a.position !== b.position) return a.position - b.position
  return a.name.localeCompare(b.name)
}

export async function getLabelsSettings(input: {
  slug: string
  userId: string
  kind: LabelKind
  teamId?: string | null
}): Promise<LabelsSettings | null> {
  if (!isValidWorkspaceSlug(input.slug)) return null
  if (!isLabelKind(input.kind)) return null
  if (input.kind === "project" && input.teamId) return null

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
  let canEdit =
    (role === "owner" || role === "admin") && !deletionLocked

  if (input.teamId) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, key, name, deleted_at")
      .eq("id", input.teamId)
      .eq("workspace_id", workspace.id)
      .maybeSingle()

    if (teamError) throw new Error(teamError.message)
    if (!team || team.deleted_at) return null

    teamKey = team.key
    teamName = team.name

    const { data: teamMembership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", input.userId)
      .maybeSingle()

    const teamRole = teamMembership?.role
    canEdit =
      !deletionLocked &&
      (role === "owner" ||
        role === "admin" ||
        teamRole === "owner" ||
        teamRole === "admin")
  }

  let query = supabase
    .from("labels")
    .select(LABEL_SELECT)
    .eq("workspace_id", workspace.id)
    .eq("kind", input.kind)
    .order("position", { ascending: true })
    .order("name", { ascending: true })

  if (input.teamId) {
    query = query.eq("team_id", input.teamId)
  } else if (input.kind === "project") {
    query = query.is("team_id", null)
  }
  // Workspace issue labels page loads workspace + team labels;
  // client filter chooses which to show.

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const labels = ((data ?? []) as unknown as LabelRow[])
    .map(mapLabelRow)
    .sort(sortLabels)

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    kind: input.kind,
    teamId: input.teamId ?? null,
    teamKey,
    teamName,
    canEdit,
    labels,
  }
}

export async function getLabelsSettingsOrNull(
  input: Parameters<typeof getLabelsSettings>[0]
): Promise<LabelsSettings | null> {
  try {
    return await getLabelsSettings(input)
  } catch {
    return null
  }
}
