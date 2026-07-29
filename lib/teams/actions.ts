"use server"

import { revalidatePath } from "next/cache"

import {
  DEFAULT_TEAM_ICON,
  parseTeamBoolean,
  parseTeamDescription,
  parseTeamEstimationScale,
  parseTeamIcon,
  parseTeamKey,
  parseTeamName,
  parseTeamTimezone,
} from "@/lib/teams/schema"
import { getTeamSettingsByKey } from "@/lib/teams/queries"
import type {
  CreateTeamResult,
  TeamActionResult,
  TeamGeneralSettingsUpdate,
  TeamSummary,
} from "@/lib/teams/types"
import { createClient } from "@/lib/supabase/server"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DEFAULT_WORKFLOW_STATES = [
  {
    name: "Backlog",
    category: "backlog",
    position: 0,
    is_default: false,
    color: "#94a3b8",
  },
  {
    name: "Todo",
    category: "unstarted",
    position: 0,
    is_default: true,
    color: "#a78bfa",
  },
  {
    name: "In Progress",
    category: "started",
    position: 0,
    is_default: false,
    color: "#60a5fa",
  },
  {
    name: "Done",
    category: "completed",
    position: 0,
    is_default: false,
    color: "#34d399",
  },
  {
    name: "Canceled",
    category: "canceled",
    position: 0,
    is_default: false,
    color: "#f87171",
  },
  {
    name: "Duplicate",
    category: "duplicate",
    position: 0,
    is_default: false,
    color: "#94a3b8",
  },
] as const

type Authed = {
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

async function requireWorkspaceMember(
  workspaceId: string,
  workspaceSlug: string
): Promise<Authed | { error: string }> {
  if (!UUID_RE.test(workspaceId)) {
    return { error: "Workspace not found." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "You must be signed in." }
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug")
    .eq("id", workspaceId)
    .maybeSingle()

  if (workspaceError) return { error: workspaceError.message }
  if (!workspace || workspace.slug !== workspaceSlug) {
    return { error: "Workspace not found." }
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) return { error: membershipError.message }
  if (!membership) {
    return { error: "You are not a member of this workspace." }
  }

  return { userId: user.id, supabase }
}

function isAuthError(
  auth: Authed | { error: string }
): auth is { error: string } {
  return "error" in auth
}

async function seedDefaultWorkflowStates(
  supabase: Authed["supabase"],
  teamId: string
) {
  return supabase.from("workflow_states").insert(
    DEFAULT_WORKFLOW_STATES.map((state) => ({
      team_id: teamId,
      name: state.name,
      description: "",
      category: state.category,
      position: state.position,
      is_default: state.is_default,
      color: state.color,
    }))
  )
}

function normalizeCopiedStates(
  sourceStates: {
    name: string
    description?: string | null
    category: string
    position: number
    is_default: boolean
    color: string | null
  }[]
) {
  let defaultSeen = false
  const rows = sourceStates.map((state) => {
    let isDefault = Boolean(state.is_default)
    if (isDefault) {
      if (defaultSeen) isDefault = false
      else defaultSeen = true
    }
    return {
      name: state.name,
      description: state.description ?? "",
      category: state.category,
      position: state.position,
      is_default: isDefault,
      color: state.color,
    }
  })

  if (!defaultSeen && rows.length > 0) {
    const unstarted = rows.findIndex((row) => row.category === "unstarted")
    rows[unstarted >= 0 ? unstarted : 0]!.is_default = true
  }

  return rows
}

export async function createTeam(input: {
  workspaceId: string
  workspaceSlug: string
  name: string
  key: string
  icon?: string | null
  timezone: string
  copyFromTeamId?: string | null
}): Promise<CreateTeamResult> {
  try {
    const nameParsed = parseTeamName(input.name)
    if (nameParsed.error || !nameParsed.name) {
      return { error: nameParsed.error ?? "Enter a team name." }
    }

    const keyParsed = parseTeamKey(input.key, nameParsed.name)
    if (keyParsed.error || !keyParsed.key) {
      return { error: keyParsed.error ?? "Enter a team identifier." }
    }

    const iconParsed = parseTeamIcon(input.icon)
    if (iconParsed.error || !iconParsed.icon) {
      return { error: iconParsed.error ?? "Invalid icon." }
    }

    const tzParsed = parseTeamTimezone(input.timezone)
    if (tzParsed.error || !tzParsed.timezone) {
      return { error: tzParsed.error ?? "Pick a timezone." }
    }

    const auth = await requireWorkspaceMember(
      input.workspaceId,
      input.workspaceSlug
    )
    if (isAuthError(auth)) return { error: auth.error }
    const { supabase, userId } = auth

    const copyFromId =
      typeof input.copyFromTeamId === "string" && input.copyFromTeamId
        ? input.copyFromTeamId
        : null

    if (copyFromId) {
      if (!UUID_RE.test(copyFromId)) {
        return { error: "Copy-from team was not found." }
      }
      const { data: source, error: sourceError } = await supabase
        .from("teams")
        .select("id")
        .eq("id", copyFromId)
        .eq("workspace_id", input.workspaceId)
        .maybeSingle()
      if (sourceError) return { error: sourceError.message }
      if (!source) return { error: "Copy-from team was not found." }
    }

    const { data: created, error: insertError } = await supabase
      .from("teams")
      .insert({
        workspace_id: input.workspaceId,
        name: nameParsed.name,
        key: keyParsed.key,
        icon: iconParsed.icon,
        timezone: tzParsed.timezone,
      })
      .select(
        "id, name, key, icon, timezone, created_at, visibility, retired_at, deleted_at"
      )
      .maybeSingle()

    if (insertError) {
      if (insertError.code === "23505") {
        return { error: "That identifier is already taken in this workspace." }
      }
      return { error: insertError.message }
    }
    if (!created) return { error: "Could not create team." }

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: created.id,
      user_id: userId,
      role: "owner",
    })
    if (memberError) {
      const { error: rollbackError } = await supabase
        .from("teams")
        .delete()
        .eq("id", created.id)
      if (rollbackError) {
        return {
          error:
            "Could not finish creating the team. Refresh and try again, or delete the incomplete team.",
        }
      }
      return { error: "Could not add you as a team member." }
    }

    let warning: string | undefined

    if (copyFromId) {
      const { data: sourceStates, error: readStatesError } = await supabase
        .from("workflow_states")
        .select("name, description, category, position, is_default, color")
        .eq("team_id", copyFromId)
        .order("position")

      if (readStatesError) {
        warning =
          "Team created, but workflows could not be copied. Default statuses were kept."
      } else if (sourceStates && sourceStates.length > 0) {
        const { error: deleteError } = await supabase
          .from("workflow_states")
          .delete()
          .eq("team_id", created.id)

        if (deleteError) {
          warning =
            "Team created, but workflows could not be copied. Default statuses were kept."
        } else {
          const rows = normalizeCopiedStates(sourceStates)
          const { error: copyError } = await supabase
            .from("workflow_states")
            .insert(
              rows.map((state) => ({
                team_id: created.id,
                name: state.name,
                description: state.description,
                category: state.category,
                position: state.position,
                is_default: state.is_default,
                color: state.color,
              }))
            )

          if (copyError) {
            // Restore defaults so the team is never left without statuses.
            await supabase
              .from("workflow_states")
              .delete()
              .eq("team_id", created.id)
            const { error: seedError } = await seedDefaultWorkflowStates(
              supabase,
              created.id
            )
            warning = seedError
              ? "Team created, but workflow setup failed. Add statuses before using this team."
              : "Team created, but workflows could not be copied. Default statuses were restored."
          }
        }
      }
    }

    const team: TeamSummary = {
      id: created.id,
      name: created.name,
      key: created.key,
      icon: created.icon,
      timezone: created.timezone,
      createdAt: created.created_at,
      visibility: created.visibility ?? "workspace",
      status: "active",
      memberCount: 1,
      issueCount: 0,
      retiredAt: created.retired_at ?? null,
      deletedAt: created.deleted_at ?? null,
    }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)

    return { team, warning }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create team.",
    }
  }
}

async function loadManagedTeam(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
}): Promise<
  | {
      supabase: Authed["supabase"]
      userId: string
      team: {
        id: string
        key: string
        name: string
        icon: string | null
        timezone: string
        description: string
        estimation_scale: string
        allow_zero_estimates: boolean
        extended_estimate_scale: boolean
        count_unestimated_issues: boolean
        email_intake_enabled: boolean
        detailed_issue_history: boolean
        workspace_id: string
        retired_at: string | null
        deleted_at: string | null
      }
      membershipRole: "owner" | "admin" | "member" | null
      canManage: boolean
    }
  | { error: string }
> {
  const auth = await requireWorkspaceMember(
    input.workspaceId,
    input.workspaceSlug
  )
  if (isAuthError(auth)) return { error: auth.error }

  if (!UUID_RE.test(input.teamId)) return { error: "Team not found." }

  const { supabase, userId } = auth
  const { data: team, error } = await supabase
    .from("teams")
    .select(
      "id, key, name, icon, timezone, description, estimation_scale, allow_zero_estimates, extended_estimate_scale, count_unestimated_issues, email_intake_enabled, detailed_issue_history, workspace_id, retired_at, deleted_at"
    )
    .eq("id", input.teamId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!team) return { error: "Team not found." }

  const [{ data: membership }, { data: workspaceMembership }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", team.id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", userId)
        .maybeSingle(),
    ])

  const membershipRole =
    (membership?.role as "owner" | "admin" | "member" | undefined) ?? null

  const canManage =
    membershipRole === "owner" ||
    membershipRole === "admin" ||
    workspaceMembership?.role === "owner" ||
    workspaceMembership?.role === "admin"

  return {
    supabase,
    userId,
    team: {
      ...team,
      description: team.description ?? "",
      estimation_scale: team.estimation_scale ?? "none",
      allow_zero_estimates: Boolean(team.allow_zero_estimates),
      extended_estimate_scale: Boolean(team.extended_estimate_scale),
      count_unestimated_issues: team.count_unestimated_issues !== false,
      email_intake_enabled: Boolean(team.email_intake_enabled),
      detailed_issue_history: Boolean(team.detailed_issue_history),
    },
    membershipRole,
    canManage,
  }
}

export async function leaveTeam(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
}): Promise<TeamActionResult> {
  try {
    const loaded = await loadManagedTeam(input)
    if ("error" in loaded) return { error: loaded.error }

    const { supabase, userId, team, membershipRole } = loaded
    if (!membershipRole) {
      return { error: "You are not a member of this team." }
    }
    if (team.deleted_at) {
      return { error: "This team has been deleted." }
    }

    if (membershipRole === "owner") {
      const { count, error: countError } = await supabase
        .from("team_members")
        .select("user_id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("role", "owner")
      if (countError) return { error: countError.message }
      if ((count ?? 0) <= 1) {
        return {
          error:
            "You are the only owner. Transfer ownership or delete the team instead.",
        }
      }
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", team.id)
      .eq("user_id", userId)
    if (error) return { error: error.message }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
    )

    return { redirectTo: `/w/${input.workspaceSlug}/settings/teams` }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not leave team.",
    }
  }
}

export async function retireTeam(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
}): Promise<TeamActionResult> {
  try {
    const loaded = await loadManagedTeam(input)
    if ("error" in loaded) return { error: loaded.error }
    const { supabase, team, canManage } = loaded
    if (!canManage) {
      return { error: "Only team owners or admins can retire a team." }
    }
    if (team.deleted_at) return { error: "This team has been deleted." }
    if (team.retired_at) return {}

    const { error } = await supabase
      .from("teams")
      .update({ retired_at: new Date().toISOString() })
      .eq("id", team.id)
    if (error) return { error: error.message }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
    )
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not retire team.",
    }
  }
}

export async function restoreRetiredTeam(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
}): Promise<TeamActionResult> {
  try {
    const loaded = await loadManagedTeam(input)
    if ("error" in loaded) return { error: loaded.error }
    const { supabase, team, canManage } = loaded
    if (!canManage) {
      return { error: "Only team owners or admins can restore a team." }
    }
    if (team.deleted_at) return { error: "This team has been deleted." }
    if (!team.retired_at) return {}

    const { error } = await supabase
      .from("teams")
      .update({ retired_at: null })
      .eq("id", team.id)
    if (error) return { error: error.message }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
    )
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not restore team.",
    }
  }
}

export async function restoreDeletedTeam(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
}): Promise<TeamActionResult> {
  try {
    const loaded = await loadManagedTeam(input)
    if ("error" in loaded) return { error: loaded.error }
    const { supabase, team, canManage } = loaded
    if (!canManage) {
      return { error: "Only team owners or admins can restore a team." }
    }
    if (!team.deleted_at) return {}

    const { error } = await supabase
      .from("teams")
      .update({ deleted_at: null, retired_at: null })
      .eq("id", team.id)
    if (error) return { error: error.message }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
    )
    return {}
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not restore team.",
    }
  }
}

export async function softDeleteTeam(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  confirmName: string
}): Promise<TeamActionResult> {
  try {
    const loaded = await loadManagedTeam(input)
    if ("error" in loaded) return { error: loaded.error }
    const { supabase, team, canManage } = loaded
    if (!canManage) {
      return { error: "Only team owners or admins can delete a team." }
    }
    if (team.deleted_at) return { error: "This team is already deleted." }

    const normalizedConfirm = input.confirmName.trim().replace(/\s+/g, " ")
    const normalizedName = team.name.trim().replace(/\s+/g, " ")
    if (!normalizedConfirm || normalizedConfirm !== normalizedName) {
      return { error: "Type the exact team name to confirm deletion." }
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from("teams")
      .update({
        deleted_at: now,
        retired_at: team.retired_at ?? now,
      })
      .eq("id", team.id)
    if (error) return { error: error.message }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)

    return { redirectTo: `/w/${input.workspaceSlug}/settings/teams` }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete team.",
    }
  }
}

export async function updateTeamGeneralSettings(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  patch: TeamGeneralSettingsUpdate
}): Promise<TeamActionResult> {
  try {
    const loaded = await loadManagedTeam(input)
    if ("error" in loaded) return { error: loaded.error }
    const { supabase, userId, team, canManage } = loaded

    if (team.deleted_at) {
      return { error: "This team has been deleted." }
    }
    if (!canManage) {
      return {
        error: "Only team owners or admins can edit team settings.",
      }
    }

    const patch: Record<string, unknown> = {}
    let nextKey = team.key

    if (input.patch.name !== undefined) {
      const parsed = parseTeamName(input.patch.name)
      if (parsed.error || !parsed.name) {
        return { error: parsed.error ?? "Enter a team name." }
      }
      if (parsed.name !== team.name) patch.name = parsed.name
    }

    if (input.patch.key !== undefined) {
      const parsed = parseTeamKey(input.patch.key)
      if (parsed.error || !parsed.key) {
        return { error: parsed.error ?? "Enter a team identifier." }
      }
      if (parsed.key !== team.key) {
        patch.key = parsed.key
        nextKey = parsed.key
      }
    }

    if (input.patch.icon !== undefined) {
      const parsed = parseTeamIcon(input.patch.icon)
      if (parsed.error || !parsed.icon) {
        return { error: parsed.error ?? "Invalid icon." }
      }
      if (parsed.icon !== (team.icon || DEFAULT_TEAM_ICON)) patch.icon = parsed.icon
    }

    if (input.patch.description !== undefined) {
      const parsed = parseTeamDescription(input.patch.description)
      if (parsed.error || parsed.description === undefined) {
        return { error: parsed.error ?? "Enter a valid description." }
      }
      if (parsed.description !== team.description) {
        patch.description = parsed.description
      }
    }

    if (input.patch.timezone !== undefined) {
      const parsed = parseTeamTimezone(input.patch.timezone)
      if (parsed.error || !parsed.timezone) {
        return { error: parsed.error ?? "Pick a timezone." }
      }
      if (parsed.timezone !== team.timezone) patch.timezone = parsed.timezone
    }

    if (input.patch.estimationScale !== undefined) {
      const parsed = parseTeamEstimationScale(input.patch.estimationScale)
      if (parsed.error || !parsed.estimationScale) {
        return { error: parsed.error ?? "Pick a valid estimation scale." }
      }
      if (parsed.estimationScale !== team.estimation_scale) {
        patch.estimation_scale = parsed.estimationScale
      }
    }

    if (input.patch.allowZeroEstimates !== undefined) {
      const parsed = parseTeamBoolean(
        input.patch.allowZeroEstimates,
        "zero estimates"
      )
      if (parsed.error || parsed.value === undefined) {
        return { error: parsed.error ?? "Pick a valid zero estimates setting." }
      }
      if (parsed.value !== team.allow_zero_estimates) {
        patch.allow_zero_estimates = parsed.value
      }
    }

    if (input.patch.extendedEstimateScale !== undefined) {
      const parsed = parseTeamBoolean(
        input.patch.extendedEstimateScale,
        "extended estimate scale"
      )
      if (parsed.error || parsed.value === undefined) {
        return {
          error: parsed.error ?? "Pick a valid extended estimate setting.",
        }
      }
      if (parsed.value !== team.extended_estimate_scale) {
        patch.extended_estimate_scale = parsed.value
      }
    }

    if (input.patch.countUnestimatedIssues !== undefined) {
      const parsed = parseTeamBoolean(
        input.patch.countUnestimatedIssues,
        "unestimated issues"
      )
      if (parsed.error || parsed.value === undefined) {
        return {
          error: parsed.error ?? "Pick a valid unestimated issues setting.",
        }
      }
      if (parsed.value !== team.count_unestimated_issues) {
        patch.count_unestimated_issues = parsed.value
      }
    }

    if (input.patch.emailIntakeEnabled !== undefined) {
      const parsed = parseTeamBoolean(
        input.patch.emailIntakeEnabled,
        "email intake"
      )
      if (parsed.error || parsed.value === undefined) {
        return { error: parsed.error ?? "Pick a valid email intake setting." }
      }
      if (parsed.value !== team.email_intake_enabled) {
        patch.email_intake_enabled = parsed.value
      }
    }

    if (input.patch.detailedIssueHistory !== undefined) {
      const parsed = parseTeamBoolean(
        input.patch.detailedIssueHistory,
        "issue history"
      )
      if (parsed.error || parsed.value === undefined) {
        return { error: parsed.error ?? "Pick a valid issue history setting." }
      }
      if (parsed.value !== team.detailed_issue_history) {
        patch.detailed_issue_history = parsed.value
      }
    }

    if (Object.keys(patch).length === 0) {
      const current = await getTeamSettingsByKey({
        workspaceId: input.workspaceId,
        key: team.key,
        userId,
      })
      if (!current) return { error: "Team not found." }
      return { team: current }
    }

    const { data: updatedRows, error } = await supabase
      .from("teams")
      .update(patch)
      .eq("id", team.id)
      .eq("workspace_id", input.workspaceId)
      .is("deleted_at", null)
      .select("id")

    if (error) {
      if (error.code === "23505") {
        return { error: "That identifier is already used by another team." }
      }
      if (error.code === "23514") {
        return { error: "Those team settings are invalid." }
      }
      return { error: error.message }
    }
    if (!updatedRows?.length) {
      return { error: "This team has been deleted." }
    }

    const updated = await getTeamSettingsByKey({
      workspaceId: input.workspaceId,
      key: nextKey,
      userId,
    })
    if (!updated) return { error: "Team not found after save." }

    revalidatePath(`/w/${input.workspaceSlug}`)
    revalidatePath(`/w/${input.workspaceSlug}/settings/teams`)
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
    )
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${team.key.toLowerCase()}/general`
    )
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${nextKey.toLowerCase()}`
    )
    revalidatePath(
      `/w/${input.workspaceSlug}/settings/teams/${nextKey.toLowerCase()}/general`
    )

    const result: TeamActionResult = { team: updated }
    if (nextKey !== team.key) {
      result.redirectTo = `/w/${input.workspaceSlug}/settings/teams/${nextKey.toLowerCase()}/general`
    }
    return result
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update team settings.",
    }
  }
}

