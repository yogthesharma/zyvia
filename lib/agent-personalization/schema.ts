import type {
  AgentPersonalizationUpdate,
  AgentSkillInput,
} from "@/lib/agent-personalization/types"

export const MAX_GUIDANCE_LENGTH = 10_000
export const MAX_SKILL_NAME_LENGTH = 120
export const MAX_SKILL_INSTRUCTIONS_LENGTH = 20_000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isAgentSkillId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function normalizeGuidance(value: string) {
  return value.replace(/\r\n/g, "\n")
}

export function normalizeSkillName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function normalizeSkillInstructions(value: string) {
  return value.replace(/\r\n/g, "\n").trim()
}

export function parseAgentPersonalizationUpdate(
  input: unknown
): { data?: AgentPersonalizationUpdate; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid agent personalization payload." }
  }

  const raw = input as Record<string, unknown>
  const data: AgentPersonalizationUpdate = {}

  if ("guidance" in raw) {
    if (typeof raw.guidance !== "string") {
      return { error: "Invalid guidance." }
    }
    const guidance = normalizeGuidance(raw.guidance)
    if (guidance.length > MAX_GUIDANCE_LENGTH) {
      return {
        error: `Guidance must be ${MAX_GUIDANCE_LENGTH.toLocaleString()} characters or fewer.`,
      }
    }
    data.guidance = guidance
  }

  if (Object.keys(data).length === 0) {
    return { error: "No agent personalization changes provided." }
  }

  return { data }
}

export function parseAgentSkillInput(
  input: unknown
): { data?: AgentSkillInput; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid skill payload." }
  }

  const raw = input as Record<string, unknown>
  if (typeof raw.name !== "string") return { error: "Skill name is required." }
  if (typeof raw.instructions !== "string") {
    return { error: "Invalid instructions." }
  }

  const name = normalizeSkillName(raw.name)
  if (!name) return { error: "Skill name is required." }
  if (name.length > MAX_SKILL_NAME_LENGTH) {
    return { error: "Skill name is too long." }
  }

  const instructions = normalizeSkillInstructions(raw.instructions)
  if (instructions.length > MAX_SKILL_INSTRUCTIONS_LENGTH) {
    return { error: "Instructions are too long." }
  }

  return { data: { name, instructions } }
}
