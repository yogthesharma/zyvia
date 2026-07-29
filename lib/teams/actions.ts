"use server"

import { revalidatePath } from "next/cache"

import {
  parseTeamIcon,
  parseTeamKey,
  parseTeamName,
  parseTeamTimezone,
} from "@/lib/teams/schema"
import type { CreateTeamResult, TeamSummary } from "@/lib/teams/types"
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
    position: 1,
    is_default: true,
    color: "#a78bfa",
  },
  {
    name: "In Progress",
    category: "started",
    position: 2,
    is_default: false,
    color: "#60a5fa",
  },
  {
    name: "Done",
    category: "completed",
    position: 3,
    is_default: false,
    color: "#34d399",
  },
  {
    name: "Canceled",
    category: "canceled",
    position: 4,
    is_default: false,
    color: "#f87171",
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
      .select("id, name, key, icon, timezone, created_at")
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
        .select("name, category, position, is_default, color")
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
      visibility: "workspace",
      status: "active",
      memberCount: 1,
      issueCount: 0,
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
