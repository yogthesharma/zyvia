export type LabelKind = "issue" | "project"

export type LabelScopeFilter = "workspace" | "workspace_and_teams" | "archived"

export type LabelRecord = {
  id: string
  workspaceId: string
  teamId: string | null
  teamKey: string | null
  teamName: string | null
  kind: LabelKind
  name: string
  description: string
  color: string
  isGroup: boolean
  parentId: string | null
  position: number
  archivedAt: string | null
  lastAppliedAt: string | null
  createdAt: string
  usageCount: number
}

export type LabelsSettings = {
  workspaceId: string
  workspaceSlug: string
  kind: LabelKind
  /** null = workspace-level page; set for team labels page */
  teamId: string | null
  teamKey: string | null
  teamName: string | null
  canEdit: boolean
  labels: LabelRecord[]
}

export type LabelCreateInput = {
  name?: string
  description?: string
  color?: string
  parentId?: string | null
  isGroup?: boolean
}

export type LabelUpdateInput = {
  name?: string
  description?: string
  color?: string
  parentId?: string | null
}

export type LabelsActionResult = {
  error?: string
  settings?: LabelsSettings
}

export type LabelRow = {
  id: string
  workspace_id: string
  team_id: string | null
  kind: LabelKind
  name: string
  description: string
  color: string
  is_group: boolean
  parent_id: string | null
  position: number
  archived_at: string | null
  last_applied_at: string | null
  created_at: string
  teams?: { key: string; name: string } | { key: string; name: string }[] | null
  issue_labels?: { count: number }[] | null
}
