import { isAgentSkillId } from "@/lib/agent-personalization/schema"
import type {
  AgentPersonalization,
  AgentPersonalizationRow,
  AgentSkill,
  AgentSkillRow,
} from "@/lib/agent-personalization/types"
import { createClient } from "@/lib/supabase/server"

const SELECT = "guidance, guidance_updated_at"
const SKILL_SELECT = "id, name, instructions, created_at, updated_at"

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
