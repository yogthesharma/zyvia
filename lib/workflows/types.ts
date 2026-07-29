import type { StatusCategory } from "@/lib/statuses/types"

export type StaleAfterPreset =
  | "1_week"
  | "2_weeks"
  | "1_month"
  | "3_months"
  | "6_months"
  | "1_year"

export type AutoArchiveAfterPreset =
  | "never"
  | "1_week"
  | "2_weeks"
  | "1_month"
  | "3_months"
  | "6_months"
  | "1_year"

export type StatusProgressPlacement = "none" | "first" | "last"

export type WorkflowStatusOption = {
  id: string
  name: string
  color: string
  category: StatusCategory
  position: number
  isDefault: boolean
}

export type PrAutomationKey =
  | "draftPrStatusId"
  | "prOpenStatusId"
  | "prReviewStatusId"
  | "prReadyStatusId"
  | "prMergeStatusId"

export type BranchWorkflowRule = {
  id: string
  branch: string
  draftPrStatusId: string | null
  prOpenStatusId: string | null
  prReviewStatusId: string | null
  prReadyStatusId: string | null
  prMergeStatusId: string | null
}

export type TeamWorkflowSettings = {
  teamId: string
  teamKey: string
  teamName: string
  workspaceId: string
  workspaceSlug: string
  canEdit: boolean
  deletionLocked: boolean
  statuses: WorkflowStatusOption[]
  draftPrStatusId: string | null
  prOpenStatusId: string | null
  prReviewStatusId: string | null
  prReadyStatusId: string | null
  prMergeStatusId: string | null
  branchRules: BranchWorkflowRule[]
  autoCloseParent: boolean
  autoCloseSubIssues: boolean
  autoCloseStale: boolean
  staleAfterPreset: StaleAfterPreset
  staleStatusId: string | null
  autoArchiveAfterPreset: AutoArchiveAfterPreset
  statusProgressPlacement: StatusProgressPlacement
}

export type TeamWorkflowSettingsUpdate = {
  draftPrStatusId?: string | null
  prOpenStatusId?: string | null
  prReviewStatusId?: string | null
  prReadyStatusId?: string | null
  prMergeStatusId?: string | null
  branchRules?: BranchWorkflowRule[]
  autoCloseParent?: boolean
  autoCloseSubIssues?: boolean
  autoCloseStale?: boolean
  staleAfterPreset?: StaleAfterPreset
  staleStatusId?: string | null
  autoArchiveAfterPreset?: AutoArchiveAfterPreset
  statusProgressPlacement?: StatusProgressPlacement
}

export type TeamWorkflowActionResult = {
  error?: string
  settings?: TeamWorkflowSettings
}
