export type WorkspaceRole = "owner" | "admin" | "member"

export type WorkspaceSettings = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  fiscalYearStartMonth: number
  region: string
  deletionScheduledAt: string | null
  role: WorkspaceRole
  canEdit: boolean
  canDelete: boolean
  urlPrefix: string
}

export type WorkspaceSettingsUpdate = {
  name?: string
  slug?: string
  fiscalYearStartMonth?: number
}

export type WorkspaceActionResult = {
  error?: string
  workspace?: WorkspaceSettings
  redirectTo?: string
}
