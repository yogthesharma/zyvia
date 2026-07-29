export type TeamSummary = {
  id: string
  name: string
  key: string
  icon: string | null
  timezone: string
  createdAt: string
}

export type CreateTeamInput = {
  name: string
  key: string
  icon?: string | null
  timezone: string
  /** Copy workflow states from this team when set. */
  copyFromTeamId?: string | null
}

export type CreateTeamResult = {
  error?: string
  /** Non-fatal issue after the team row was created. */
  warning?: string
  team?: TeamSummary
}
