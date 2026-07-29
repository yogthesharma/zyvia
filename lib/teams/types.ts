export type TeamSummary = {
  id: string
  name: string
  key: string
  icon: string | null
  timezone: string
  createdAt: string
  /** Workspace-visible until private teams ship. */
  visibility: "workspace"
  /** Active until retire/delete flows ship. */
  status: "active"
  memberCount: number
  issueCount: number
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
