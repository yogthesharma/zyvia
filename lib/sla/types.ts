export type SlaWorkWeek = "mon_fri" | "sun_thu"

export type SlaRuleAction = "add" | "remove"

export type SlaDurationPreset =
  | "12h"
  | "24h"
  | "48h"
  | "1w"
  | "2w"
  | "4w"
  | "custom"

export type SlaCustomUnit = "hour" | "day" | "business_day" | "week"

export type SlaPriority =
  | "urgent"
  | "high"
  | "medium"
  | "low"
  | "none"

export type SlaRuleFilters = {
  priority: SlaPriority[]
}

export type SlaRule = {
  id: string
  position: number
  action: SlaRuleAction
  durationPreset: SlaDurationPreset | null
  customAmount: number | null
  customUnit: SlaCustomUnit | null
  filters: SlaRuleFilters
}

export type SlaSettings = {
  workspaceId: string
  workspaceSlug: string
  enabled: boolean
  workWeek: SlaWorkWeek
  canEdit: boolean
  rules: SlaRule[]
}

export type SlaRuleInput = {
  action: SlaRuleAction
  durationPreset?: SlaDurationPreset | null
  customAmount?: number | null
  customUnit?: SlaCustomUnit | null
  filters: SlaRuleFilters
}

export type SlaActionResult = {
  error?: string
  settings?: SlaSettings
}

export type SlaSettingsRow = {
  workspace_id: string
  enabled: boolean
  work_week: SlaWorkWeek
}

export type SlaRuleRow = {
  id: string
  workspace_id: string
  position: number
  action: SlaRuleAction
  duration_preset: SlaDurationPreset | null
  custom_amount: number | null
  custom_unit: SlaCustomUnit | null
  filters: unknown
}
