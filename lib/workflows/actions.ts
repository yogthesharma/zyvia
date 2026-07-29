"use server"

import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { getTeamWorkflowSettings } from "@/lib/workflows/queries"
import {
  emptyBranchRule,
  isWorkflowTeamId,
  normalizeBranchName,
  parseWorkflowSettingsUpdate,
} from "@/lib/workflows/schema"
import type {
  BranchWorkflowRule,
  TeamWorkflowActionResult,
  TeamWorkflowSettings,
  TeamWorkflowSettingsUpdate,
} from "@/lib/workflows/types"
import { createClient } from "@/lib/supabase/server"

type Access = {
  settings: TeamWorkflowSettings
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
}

async function requireWorkflowAccess(input: {
  slug: string
  teamId: string
}): Promise<{ error: string } | Access> {
  if (!isValidWorkspaceSlug(input.slug)) return { error: "Invalid workspace." }
  if (!isWorkflowTeamId(input.teamId)) return { error: "Team not found." }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "You must be signed in." }

  const settings = await getTeamWorkflowSettings({
    slug: input.slug,
    userId: user.id,
    teamId: input.teamId,
  })
  if (!settings) return { error: "Workspace not found." }
  if (!settings.canEdit) {
    return {
      error: "Only team managers can manage workflows & automations.",
    }
  }

  return { settings, supabase, userId: user.id }
}

async function reload(access: Access): Promise<TeamWorkflowActionResult> {
  const settings = await getTeamWorkflowSettings({
    slug: access.settings.workspaceSlug,
    userId: access.userId,
    teamId: access.settings.teamId,
  })
  if (!settings) return { error: "Could not reload workflow settings." }
  return { settings }
}

function toRowPatch(data: TeamWorkflowSettingsUpdate) {
  const patch: Record<string, unknown> = {}
  if (data.draftPrStatusId !== undefined) {
    patch.draft_pr_status_id = data.draftPrStatusId
  }
  if (data.prOpenStatusId !== undefined) {
    patch.pr_open_status_id = data.prOpenStatusId
  }
  if (data.prReviewStatusId !== undefined) {
    patch.pr_review_status_id = data.prReviewStatusId
  }
  if (data.prReadyStatusId !== undefined) {
    patch.pr_ready_status_id = data.prReadyStatusId
  }
  if (data.prMergeStatusId !== undefined) {
    patch.pr_merge_status_id = data.prMergeStatusId
  }
  if (data.branchRules !== undefined) {
    patch.branch_rules = data.branchRules
  }
  if (data.autoCloseParent !== undefined) {
    patch.auto_close_parent = data.autoCloseParent
  }
  if (data.autoCloseSubIssues !== undefined) {
    patch.auto_close_sub_issues = data.autoCloseSubIssues
  }
  if (data.autoCloseStale !== undefined) {
    patch.auto_close_stale = data.autoCloseStale
  }
  if (data.staleAfterPreset !== undefined) {
    patch.stale_after_preset = data.staleAfterPreset
  }
  if (data.staleStatusId !== undefined) {
    patch.stale_status_id = data.staleStatusId
  }
  if (data.autoArchiveAfterPreset !== undefined) {
    patch.auto_archive_after_preset = data.autoArchiveAfterPreset
  }
  if (data.statusProgressPlacement !== undefined) {
    patch.status_progress_placement = data.statusProgressPlacement
  }
  return patch
}

async function ensureSettingsRow(access: Access) {
  const { data, error } = await access.supabase
    .from("team_workflow_settings")
    .select("team_id")
    .eq("team_id", access.settings.teamId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (data) return { error: null }

  const canceled =
    access.settings.statuses.find((status) => status.category === "canceled")
      ?.id ?? null
  const { error: insertError } = await access.supabase
    .from("team_workflow_settings")
    .insert({
      team_id: access.settings.teamId,
      stale_status_id: canceled,
    })
  if (insertError && !/duplicate|unique/i.test(insertError.message)) {
    return { error: insertError.message }
  }
  return { error: null }
}

function settingsEqualField(
  settings: TeamWorkflowSettings,
  data: TeamWorkflowSettingsUpdate
) {
  const checks: boolean[] = []
  if (data.draftPrStatusId !== undefined) {
    checks.push(settings.draftPrStatusId === data.draftPrStatusId)
  }
  if (data.prOpenStatusId !== undefined) {
    checks.push(settings.prOpenStatusId === data.prOpenStatusId)
  }
  if (data.prReviewStatusId !== undefined) {
    checks.push(settings.prReviewStatusId === data.prReviewStatusId)
  }
  if (data.prReadyStatusId !== undefined) {
    checks.push(settings.prReadyStatusId === data.prReadyStatusId)
  }
  if (data.prMergeStatusId !== undefined) {
    checks.push(settings.prMergeStatusId === data.prMergeStatusId)
  }
  if (data.branchRules !== undefined) {
    checks.push(
      JSON.stringify(settings.branchRules) === JSON.stringify(data.branchRules)
    )
  }
  if (data.autoCloseParent !== undefined) {
    checks.push(settings.autoCloseParent === data.autoCloseParent)
  }
  if (data.autoCloseSubIssues !== undefined) {
    checks.push(settings.autoCloseSubIssues === data.autoCloseSubIssues)
  }
  if (data.autoCloseStale !== undefined) {
    checks.push(settings.autoCloseStale === data.autoCloseStale)
  }
  if (data.staleAfterPreset !== undefined) {
    checks.push(settings.staleAfterPreset === data.staleAfterPreset)
  }
  if (data.staleStatusId !== undefined) {
    checks.push(settings.staleStatusId === data.staleStatusId)
  }
  if (data.autoArchiveAfterPreset !== undefined) {
    checks.push(settings.autoArchiveAfterPreset === data.autoArchiveAfterPreset)
  }
  if (data.statusProgressPlacement !== undefined) {
    checks.push(
      settings.statusProgressPlacement === data.statusProgressPlacement
    )
  }
  return checks.length > 0 && checks.every(Boolean)
}

export async function updateTeamWorkflowSettings(input: {
  slug: string
  teamId: string
  data: TeamWorkflowSettingsUpdate
}): Promise<TeamWorkflowActionResult> {
  try {
    const access = await requireWorkflowAccess(input)
    if ("error" in access) return { error: access.error }

    const validStatusIds = new Set(
      access.settings.statuses.map((status) => status.id)
    )
    const parsed = parseWorkflowSettingsUpdate(input.data, validStatusIds)
    if ("error" in parsed) return { error: parsed.error }

    // Stale auto-close always needs a target status.
    const willCloseStale =
      parsed.data.autoCloseStale !== undefined
        ? parsed.data.autoCloseStale
        : access.settings.autoCloseStale
    const nextStaleStatusId =
      parsed.data.staleStatusId !== undefined
        ? parsed.data.staleStatusId
        : access.settings.staleStatusId
    if (willCloseStale && nextStaleStatusId == null) {
      const canceled =
        access.settings.statuses.find((status) => status.category === "canceled")
          ?.id ?? access.settings.statuses[0]?.id ?? null
      if (!canceled) {
        return {
          error: "Add a Canceled status before enabling stale auto-close.",
        }
      }
      parsed.data.staleStatusId = canceled
    }

    if (settingsEqualField(access.settings, parsed.data)) {
      return { settings: access.settings }
    }

    const patch = toRowPatch(parsed.data)
    const ensured = await ensureSettingsRow(access)
    if (ensured.error) return { error: ensured.error }

    const { error } = await access.supabase
      .from("team_workflow_settings")
      .update(patch)
      .eq("team_id", access.settings.teamId)
    if (error) return { error: error.message }

    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update workflow settings.",
    }
  }
}

export async function addTeamWorkflowBranchRule(input: {
  slug: string
  teamId: string
  branch: string
}): Promise<TeamWorkflowActionResult> {
  try {
    const access = await requireWorkflowAccess(input)
    if ("error" in access) return { error: access.error }

    const branch = normalizeBranchName(input.branch)
    if (!branch) return { error: "Enter a branch name." }
    if (branch.length > 120) {
      return { error: "Branch name must be 120 characters or fewer." }
    }
    if (
      access.settings.branchRules.some(
        (rule) => rule.branch.toLowerCase() === branch.toLowerCase()
      )
    ) {
      return { error: "That branch already has a rule." }
    }
    if (access.settings.branchRules.length >= 50) {
      return { error: "You can add up to 50 branch rules." }
    }

    const nextRules: BranchWorkflowRule[] = [
      ...access.settings.branchRules,
      emptyBranchRule(branch),
    ]

    return updateTeamWorkflowSettings({
      slug: input.slug,
      teamId: input.teamId,
      data: { branchRules: nextRules },
    })
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not add branch rule.",
    }
  }
}

export async function removeTeamWorkflowBranchRule(input: {
  slug: string
  teamId: string
  ruleId: string
}): Promise<TeamWorkflowActionResult> {
  try {
    const access = await requireWorkflowAccess(input)
    if ("error" in access) return { error: access.error }

    if (!access.settings.branchRules.some((rule) => rule.id === input.ruleId)) {
      return { error: "Branch rule not found." }
    }

    const nextRules = access.settings.branchRules.filter(
      (rule) => rule.id !== input.ruleId
    )

    return updateTeamWorkflowSettings({
      slug: input.slug,
      teamId: input.teamId,
      data: { branchRules: nextRules },
    })
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not remove branch rule.",
    }
  }
}

export async function updateTeamWorkflowBranchRule(input: {
  slug: string
  teamId: string
  ruleId: string
  patch: Partial<
    Pick<
      BranchWorkflowRule,
      | "draftPrStatusId"
      | "prOpenStatusId"
      | "prReviewStatusId"
      | "prReadyStatusId"
      | "prMergeStatusId"
    >
  >
}): Promise<TeamWorkflowActionResult> {
  try {
    if (!isWorkflowTeamId(input.ruleId)) {
      return { error: "Branch rule not found." }
    }
    const access = await requireWorkflowAccess(input)
    if ("error" in access) return { error: access.error }

    const index = access.settings.branchRules.findIndex(
      (rule) => rule.id === input.ruleId
    )
    if (index < 0) return { error: "Branch rule not found." }

    const current = access.settings.branchRules[index]!
    const nextRules = access.settings.branchRules.slice()
    nextRules[index] = {
      ...current,
      ...input.patch,
      id: current.id,
      branch: current.branch,
    }

    return updateTeamWorkflowSettings({
      slug: input.slug,
      teamId: input.teamId,
      data: { branchRules: nextRules },
    })
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update branch rule.",
    }
  }
}
