import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import {
  DEFAULT_STATUS_COLOR,
  ISSUE_STATUS_CATEGORIES,
  isIssueStatusCategory,
  normalizeStatusColor,
} from "@/lib/statuses/schema"
import type { WorkspaceRole } from "@/lib/workspace/types"
import {
  isAutoArchiveAfterPreset,
  isStaleAfterPreset,
  isStatusProgressPlacement,
  parseBranchRules,
} from "@/lib/workflows/schema"
import type {
  TeamWorkflowSettings,
  WorkflowStatusOption,
} from "@/lib/workflows/types"
import { createClient } from "@/lib/supabase/server"

type WorkflowSettingsRow = {
  team_id: string
  draft_pr_status_id: string | null
  pr_open_status_id: string | null
  pr_review_status_id: string | null
  pr_ready_status_id: string | null
  pr_merge_status_id: string | null
  branch_rules: unknown
  auto_close_parent: boolean
  auto_close_sub_issues: boolean
  auto_close_stale: boolean
  stale_after_preset: string
  stale_status_id: string | null
  auto_archive_after_preset: string
  status_progress_placement: string
}

type StatusRow = {
  id: string
  name: string
  color: string | null
  category: string
  is_default: boolean
  position: number
}

function mapStatus(row: StatusRow): WorkflowStatusOption | null {
  if (!isIssueStatusCategory(row.category)) return null
  return {
    id: row.id,
    name: row.name,
    color: normalizeStatusColor(row.color ?? "") ?? DEFAULT_STATUS_COLOR,
    category: row.category,
    position: row.position ?? 0,
    isDefault: Boolean(row.is_default),
  }
}

function sortStatusOptions(a: WorkflowStatusOption, b: WorkflowStatusOption) {
  const aCat = ISSUE_STATUS_CATEGORIES.indexOf(
    a.category as (typeof ISSUE_STATUS_CATEGORIES)[number]
  )
  const bCat = ISSUE_STATUS_CATEGORIES.indexOf(
    b.category as (typeof ISSUE_STATUS_CATEGORIES)[number]
  )
  if (aCat !== bCat) return aCat - bCat
  if (a.position !== b.position) return a.position - b.position
  return a.name.localeCompare(b.name)
}

function defaultsForTeam(input: {
  teamId: string
  teamKey: string
  teamName: string
  workspaceId: string
  workspaceSlug: string
  canEdit: boolean
  deletionLocked: boolean
  statuses: WorkflowStatusOption[]
}): TeamWorkflowSettings {
  const canceled =
    input.statuses.find((status) => status.category === "canceled")?.id ?? null
  return {
    teamId: input.teamId,
    teamKey: input.teamKey,
    teamName: input.teamName,
    workspaceId: input.workspaceId,
    workspaceSlug: input.workspaceSlug,
    canEdit: input.canEdit,
    deletionLocked: input.deletionLocked,
    statuses: input.statuses,
    draftPrStatusId: null,
    prOpenStatusId: null,
    prReviewStatusId: null,
    prReadyStatusId: null,
    prMergeStatusId: null,
    branchRules: [],
    autoCloseParent: false,
    autoCloseSubIssues: false,
    autoCloseStale: false,
    staleAfterPreset: "6_months",
    staleStatusId: canceled,
    autoArchiveAfterPreset: "6_months",
    statusProgressPlacement: "first",
  }
}

export async function getTeamWorkflowSettings(input: {
  slug: string
  userId: string
  teamId: string
}): Promise<TeamWorkflowSettings | null> {
  if (!isValidWorkspaceSlug(input.slug)) return null

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

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, key, name, workspace_id, deleted_at")
    .eq("id", input.teamId)
    .eq("workspace_id", workspace.id)
    .maybeSingle()

  if (teamError) throw new Error(teamError.message)
  if (!team || team.deleted_at) return null

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", input.userId)
    .maybeSingle()

  const teamRole = teamMember?.role as "owner" | "admin" | "member" | undefined
  const canEdit =
    !deletionLocked &&
    (role === "owner" ||
      role === "admin" ||
      teamRole === "owner" ||
      teamRole === "admin")

  const { data: statusRows, error: statusError } = await supabase
    .from("workflow_states")
    .select("id, name, color, category, is_default, position")
    .eq("team_id", team.id)
    .order("position", { ascending: true })

  if (statusError) throw new Error(statusError.message)

  const statuses = ((statusRows ?? []) as StatusRow[])
    .map(mapStatus)
    .filter((row): row is WorkflowStatusOption => row != null)
    .sort(sortStatusOptions)

  const base = defaultsForTeam({
    teamId: team.id,
    teamKey: team.key,
    teamName: team.name,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    canEdit,
    deletionLocked,
    statuses,
  })

  const { data: row, error } = await supabase
    .from("team_workflow_settings")
    .select(
      "team_id, draft_pr_status_id, pr_open_status_id, pr_review_status_id, pr_ready_status_id, pr_merge_status_id, branch_rules, auto_close_parent, auto_close_sub_issues, auto_close_stale, stale_after_preset, stale_status_id, auto_archive_after_preset, status_progress_placement"
    )
    .eq("team_id", team.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!row) return base

  const settingsRow = row as WorkflowSettingsRow
  const statusIds = new Set(statuses.map((status) => status.id))

  function sanitizeStatusId(value: string | null) {
    if (!value || !statusIds.has(value)) return null
    return value
  }

  return {
    ...base,
    draftPrStatusId: sanitizeStatusId(settingsRow.draft_pr_status_id),
    prOpenStatusId: sanitizeStatusId(settingsRow.pr_open_status_id),
    prReviewStatusId: sanitizeStatusId(settingsRow.pr_review_status_id),
    prReadyStatusId: sanitizeStatusId(settingsRow.pr_ready_status_id),
    prMergeStatusId: sanitizeStatusId(settingsRow.pr_merge_status_id),
    branchRules: parseBranchRules(settingsRow.branch_rules).map((rule) => ({
      ...rule,
      draftPrStatusId: sanitizeStatusId(rule.draftPrStatusId),
      prOpenStatusId: sanitizeStatusId(rule.prOpenStatusId),
      prReviewStatusId: sanitizeStatusId(rule.prReviewStatusId),
      prReadyStatusId: sanitizeStatusId(rule.prReadyStatusId),
      prMergeStatusId: sanitizeStatusId(rule.prMergeStatusId),
    })),
    autoCloseParent: Boolean(settingsRow.auto_close_parent),
    autoCloseSubIssues: Boolean(settingsRow.auto_close_sub_issues),
    autoCloseStale: Boolean(settingsRow.auto_close_stale),
    staleAfterPreset: isStaleAfterPreset(settingsRow.stale_after_preset)
      ? settingsRow.stale_after_preset
      : "6_months",
    staleStatusId: sanitizeStatusId(settingsRow.stale_status_id),
    autoArchiveAfterPreset: isAutoArchiveAfterPreset(
      settingsRow.auto_archive_after_preset
    )
      ? settingsRow.auto_archive_after_preset
      : "6_months",
    statusProgressPlacement: isStatusProgressPlacement(
      settingsRow.status_progress_placement
    )
      ? settingsRow.status_progress_placement
      : "first",
  }
}

export async function getTeamWorkflowSettingsOrNull(input: {
  slug: string
  userId: string
  teamId: string
}): Promise<TeamWorkflowSettings | null> {
  try {
    return await getTeamWorkflowSettings(input)
  } catch {
    return null
  }
}
