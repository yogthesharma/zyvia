"use server"

import {
  getTeamAgentSkillsSettings,
  mapAgentPersonalizationRow,
  mapAgentSkillRow,
  mapTeamAgentSkillRow,
} from "@/lib/agent-personalization/queries"
import {
  isAgentSkillId,
  normalizeSkillInstructions,
  normalizeSkillName,
  parseAgentPersonalizationUpdate,
  parseAgentSkillInput,
} from "@/lib/agent-personalization/schema"
import type {
  AgentPersonalizationActionResult,
  AgentPersonalizationRow,
  AgentPersonalizationUpdate,
  AgentSkillActionResult,
  AgentSkillInput,
  AgentSkillRow,
  TeamAgentSkillRow,
} from "@/lib/agent-personalization/types"
import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { createClient } from "@/lib/supabase/server"

function agentPersonalizationPath(workspaceSlug: string) {
  if (!isValidWorkspaceSlug(workspaceSlug)) return null
  return `/w/${workspaceSlug}/settings/agent-personalization`
}

function teamAgentSkillsPath(workspaceSlug: string, teamKey: string) {
  if (!isValidWorkspaceSlug(workspaceSlug)) return null
  const key = teamKey.trim().toLowerCase()
  if (!/^[a-z]{2,4}$/.test(key)) return null
  return `/w/${workspaceSlug}/settings/teams/${key}/agent-skills`
}

export async function updateAgentPersonalization(
  input: AgentPersonalizationUpdate
): Promise<AgentPersonalizationActionResult> {
  try {
    const parsed = parseAgentPersonalizationUpdate(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid agent personalization." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "You must be signed in to save agent personalization." }
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.guidance !== undefined) {
      patch.guidance = parsed.data.guidance
      patch.guidance_updated_at = new Date().toISOString()
    }

    const { error } = await supabase.from("user_agent_personalization").upsert(
      { user_id: user.id, ...patch },
      { onConflict: "user_id" }
    )

    if (error) {
      if (error.code === "23514") {
        return { error: "Guidance is too long." }
      }
      return { error: error.message }
    }

    const { data, error: readError } = await supabase
      .from("user_agent_personalization")
      .select("guidance, guidance_updated_at")
      .eq("user_id", user.id)
      .maybeSingle()

    if (readError) return { error: readError.message }

    return {
      settings: mapAgentPersonalizationRow(
        (data as AgentPersonalizationRow | null) ?? null
      ),
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save agent personalization.",
    }
  }
}

export async function createAgentSkill(
  workspaceSlug: string,
  input: AgentSkillInput
): Promise<AgentSkillActionResult> {
  try {
    const redirectTo = agentPersonalizationPath(workspaceSlug)
    if (!redirectTo) return { error: "Invalid workspace." }

    const parsed = parseAgentSkillInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid skill." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "You must be signed in to create a skill." }
    }

    const { data, error } = await supabase
      .from("user_agent_skills")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        instructions: parsed.data.instructions,
      })
      .select("id, name, instructions, created_at, updated_at")
      .single()

    if (error) {
      if (error.code === "23514") {
        return { error: "That skill name or instructions format is invalid." }
      }
      return { error: error.message }
    }

    return {
      skill: mapAgentSkillRow(data as AgentSkillRow),
      redirectTo,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create skill.",
    }
  }
}

export async function updateAgentSkill(
  workspaceSlug: string,
  skillId: string,
  input: AgentSkillInput
): Promise<AgentSkillActionResult> {
  try {
    const redirectTo = agentPersonalizationPath(workspaceSlug)
    if (!redirectTo) return { error: "Invalid workspace." }
    if (!isAgentSkillId(skillId)) return { error: "Skill not found." }

    const parsed = parseAgentSkillInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid skill." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "You must be signed in to update a skill." }
    }

    const { data: existing, error: existingError } = await supabase
      .from("user_agent_skills")
      .select("id, name, instructions, created_at, updated_at")
      .eq("id", skillId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) return { error: existingError.message }
    if (!existing) return { error: "Skill not found." }

    const current = existing as AgentSkillRow
    const nextName = parsed.data.name
    const nextInstructions = parsed.data.instructions
    if (
      nextName === normalizeSkillName(current.name) &&
      nextInstructions === normalizeSkillInstructions(current.instructions)
    ) {
      return {
        skill: mapAgentSkillRow(current),
        redirectTo,
      }
    }

    const { data, error } = await supabase
      .from("user_agent_skills")
      .update({
        name: nextName,
        instructions: nextInstructions,
      })
      .eq("id", skillId)
      .eq("user_id", user.id)
      .select("id, name, instructions, created_at, updated_at")
      .maybeSingle()

    if (error) {
      if (error.code === "23514") {
        return { error: "That skill name or instructions format is invalid." }
      }
      return { error: error.message }
    }
    if (!data) return { error: "Skill not found." }

    return {
      skill: mapAgentSkillRow(data as AgentSkillRow),
      redirectTo,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update skill.",
    }
  }
}

export async function createTeamAgentSkill(
  workspaceSlug: string,
  teamKey: string,
  input: AgentSkillInput
): Promise<AgentSkillActionResult> {
  try {
    const redirectTo = teamAgentSkillsPath(workspaceSlug, teamKey)
    if (!redirectTo) return { error: "Invalid workspace or team." }

    const parsed = parseAgentSkillInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid skill." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: "You must be signed in to create a skill." }
    }

    const settings = await getTeamAgentSkillsSettings({
      slug: workspaceSlug,
      teamKey,
      userId: user.id,
    })
    if (!settings) return { error: "Team not found." }
    if (!settings.canEdit) {
      return { error: "You do not have permission to manage team skills." }
    }

    const { data, error } = await supabase
      .from("team_agent_skills")
      .insert({
        workspace_id: settings.workspaceId,
        team_id: settings.teamId,
        name: parsed.data.name,
        instructions: parsed.data.instructions,
        created_by: user.id,
      })
      .select(
        "id, workspace_id, team_id, name, instructions, created_at, updated_at"
      )
      .single()

    if (error) {
      if (error.code === "23514") {
        return { error: "That skill name or instructions format is invalid." }
      }
      return { error: error.message }
    }

    return {
      skill: mapTeamAgentSkillRow(data as TeamAgentSkillRow),
      redirectTo,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create skill.",
    }
  }
}

export async function updateTeamAgentSkill(
  workspaceSlug: string,
  teamKey: string,
  skillId: string,
  input: AgentSkillInput
): Promise<AgentSkillActionResult> {
  try {
    const redirectTo = teamAgentSkillsPath(workspaceSlug, teamKey)
    if (!redirectTo) return { error: "Invalid workspace or team." }
    if (!isAgentSkillId(skillId)) return { error: "Skill not found." }

    const parsed = parseAgentSkillInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid skill." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: "You must be signed in to update a skill." }
    }

    const settings = await getTeamAgentSkillsSettings({
      slug: workspaceSlug,
      teamKey,
      userId: user.id,
    })
    if (!settings) return { error: "Team not found." }
    if (!settings.canEdit) {
      return { error: "You do not have permission to manage team skills." }
    }

    const { data: existing, error: existingError } = await supabase
      .from("team_agent_skills")
      .select(
        "id, workspace_id, team_id, name, instructions, created_at, updated_at"
      )
      .eq("id", skillId)
      .eq("team_id", settings.teamId)
      .maybeSingle()

    if (existingError) return { error: existingError.message }
    if (!existing) return { error: "Skill not found." }

    const current = existing as TeamAgentSkillRow
    const nextName = parsed.data.name
    const nextInstructions = parsed.data.instructions
    if (
      nextName === normalizeSkillName(current.name) &&
      nextInstructions === normalizeSkillInstructions(current.instructions)
    ) {
      return {
        skill: mapTeamAgentSkillRow(current),
        redirectTo,
      }
    }

    const { data, error } = await supabase
      .from("team_agent_skills")
      .update({
        name: nextName,
        instructions: nextInstructions,
      })
      .eq("id", skillId)
      .eq("team_id", settings.teamId)
      .select(
        "id, workspace_id, team_id, name, instructions, created_at, updated_at"
      )
      .maybeSingle()

    if (error) {
      if (error.code === "23514") {
        return { error: "That skill name or instructions format is invalid." }
      }
      return { error: error.message }
    }
    if (!data) return { error: "Skill not found." }

    return {
      skill: mapTeamAgentSkillRow(data as TeamAgentSkillRow),
      redirectTo,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update skill.",
    }
  }
}
