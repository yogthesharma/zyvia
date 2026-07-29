export type IssueStatusCategory =
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled"
  | "duplicate"

export type ProjectStatusCategory =
  | "backlog"
  | "planned"
  | "started"
  | "completed"
  | "canceled"

export type StatusKind = "issue" | "project"

export type StatusCategory = IssueStatusCategory | ProjectStatusCategory

export type StatusRecord = {
  id: string
  name: string
  description: string
  category: StatusCategory
  position: number
  isDefault: boolean
  color: string
  usageCount: number
}

export type StatusesSettings = {
  kind: StatusKind
  workspaceId: string
  workspaceSlug: string
  teamId: string | null
  teamKey: string | null
  teamName: string | null
  canEdit: boolean
  deletionLocked: boolean
  statuses: StatusRecord[]
}

export type StatusCreateInput = {
  category: StatusCategory
  name: string
  description?: string
  color?: string
}

export type StatusUpdateInput = {
  name?: string
  description?: string
  color?: string
  isDefault?: boolean
}

export type StatusesActionResult = {
  error?: string
  settings?: StatusesSettings
}
