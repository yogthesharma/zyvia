import { isAgentSkillId } from "@/lib/agent-personalization/schema"
import type {
  AgentPersonalization,
  AgentPersonalizationRow,
  AgentSkill,
  AgentSkillRow,
  TeamAgentSkill,
  TeamAgentSkillRow,
  TeamAgentSkillsSettings,
} from "@/lib/agent-personalization/types"
import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import type { WorkspaceRole } from "@/lib/workspace/types"
import { createClient } from "@/lib/supabase/server"

const SELECT = "guidance, guidance_updated_at"
const SKILL_SELECT = "id, name, instructions, created_at, updated_at"
const TEAM_SKILL_SELECT =
  "id, workspace_id, team_id, name, instructions, created_at, updated_at"

export function mapAgentPersonalizationRow(
  row: AgentPersonalizationRow | null
): AgentPersonalization {
  return {
    guidance: row?.guidance ?? "",
    guidanceUpdatedAt: row?.guidance_updated_at ?? null,
  }
}

export function mapAgentSkillRow(row: AgentSkillRow): AgentSkill {
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapTeamAgentSkillRow(row: TeamAgentSkillRow): TeamAgentSkill {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    teamId: row.team_id,
    name: row.name,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function ensureAgentPersonalization(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_agent_personalization").upsert(
    { user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true }
  )
  if (error) throw new Error(error.message)
}

export async function getAgentPersonalization(
  userId: string
): Promise<AgentPersonalization> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_agent_personalization")
    .select(SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data) {
    await ensureAgentPersonalization(userId)
    const { data: created, error: readError } = await supabase
      .from("user_agent_personalization")
      .select(SELECT)
      .eq("user_id", userId)
      .maybeSingle()

    if (readError) throw new Error(readError.message)
    return mapAgentPersonalizationRow(
      (created as AgentPersonalizationRow | null) ?? null
    )
  }

  return mapAgentPersonalizationRow(data as AgentPersonalizationRow)
}

export async function listAgentSkills(userId: string): Promise<AgentSkill[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_agent_skills")
    .select(SKILL_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as AgentSkillRow[]).map(mapAgentSkillRow)
}

export async function getAgentSkill(
  userId: string,
  skillId: string
): Promise<AgentSkill | null> {
  if (!isAgentSkillId(skillId)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_agent_skills")
    .select(SKILL_SELECT)
    .eq("user_id", userId)
    .eq("id", skillId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapAgentSkillRow(data as AgentSkillRow)
}

export async function getTeamAgentSkillsSettings(input: {
  slug: string
  teamKey: string
  userId: string
}): Promise<TeamAgentSkillsSettings | null> {
  if (!isValidWorkspaceSlug(input.slug)) return null
  const key = input.teamKey.trim().toUpperCase()
  if (!/^[A-Z]{2,4}$/.test(key)) return null

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

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, key, name, deleted_at")
    .eq("workspace_id", workspace.id)
    .eq("key", key)
    .maybeSingle()

  if (teamError) throw new Error(teamError.message)
  if (!team || team.deleted_at) return null

  const { data: teamMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", input.userId)
    .maybeSingle()

  const role = membership.role as WorkspaceRole
  const deletionLocked = Boolean(workspace.deletion_scheduled_at)
  const canEdit =
    !deletionLocked &&
    (role === "owner" || role === "admin" || teamMembership?.role != null)

  const { data, error } = await supabase
    .from("team_agent_skills")
    .select(TEAM_SKILL_SELECT)
    .eq("team_id", team.id)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(error.message)

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    teamId: team.id,
    teamKey: team.key,
    teamName: team.name,
    canEdit,
    skills: ((data ?? []) as TeamAgentSkillRow[]).map(mapTeamAgentSkillRow),
  }
}

export async function getTeamAgentSkillsSettingsOrNull(
  input: Parameters<typeof getTeamAgentSkillsSettings>[0]
): Promise<TeamAgentSkillsSettings | null> {
  try {
    return await getTeamAgentSkillsSettings(input)
  } catch {
    return null
  }
}

export async function getTeamAgentSkill(input: {
  skillId: string
  teamId: string
}): Promise<TeamAgentSkill | null> {
  if (!isAgentSkillId(input.skillId)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("team_agent_skills")
    .select(TEAM_SKILL_SELECT)
    .eq("id", input.skillId)
    .eq("team_id", input.teamId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapTeamAgentSkillRow(data as TeamAgentSkillRow)
}
