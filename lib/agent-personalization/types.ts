export type AgentPersonalization = {
  guidance: string
  guidanceUpdatedAt: string | null
}

export type AgentPersonalizationUpdate = {
  guidance?: string
}

export type AgentPersonalizationActionResult = {
  error?: string
  settings?: AgentPersonalization
}

export type AgentPersonalizationRow = {
  guidance: string
  guidance_updated_at: string | null
}

export type AgentSkill = {
  id: string
  name: string
  instructions: string
  createdAt: string
  updatedAt: string
}

export type AgentSkillInput = {
  name: string
  instructions: string
}

export type AgentSkillActionResult = {
  error?: string
  skill?: AgentSkill
  redirectTo?: string
}

export type AgentSkillRow = {
  id: string
  name: string
  instructions: string
  created_at: string
  updated_at: string
}
