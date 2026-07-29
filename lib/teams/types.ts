export type TeamVisibility = "workspace" | "private"

export type TeamEstimationScale =
  | "none"
  | "exponential"
  | "fibonacci"
  | "linear"
  | "tshirt"

/** Derived list/filter status from retired_at / deleted_at. */
export type TeamLifecycleStatus = "active" | "retired" | "deleted"

export type TeamSummary = {
  id: string
  name: string
  key: string
  icon: string | null
  timezone: string
  createdAt: string
  visibility: TeamVisibility
  status: TeamLifecycleStatus
  memberCount: number
  issueCount: number
  retiredAt: string | null
  deletedAt: string | null
}

export type TeamSettings = TeamSummary & {
  workspaceId: string
  estimationScale: TeamEstimationScale
  parentTeamId: string | null
  triageEnabled: boolean
  workflowStateCount: number
  membershipRole: "owner" | "admin" | "member" | null
  /** Current user is on the team. */
  isMember: boolean
  /** Can retire/delete or edit team settings (team owner/admin or workspace owner/admin). */
  canManage: boolean
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

export type TeamActionResult = {
  error?: string
  team?: TeamSettings
  redirectTo?: string
}
