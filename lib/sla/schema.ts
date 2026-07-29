import type {
  SlaCustomUnit,
  SlaDurationPreset,
  SlaPriority,
  SlaRuleAction,
  SlaRuleFilters,
  SlaRuleInput,
  SlaWorkWeek,
} from "@/lib/sla/types"

export const SLA_PRIORITIES: SlaPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]

export const SLA_DURATION_PRESETS: SlaDurationPreset[] = [
  "12h",
  "24h",
  "48h",
  "1w",
  "2w",
  "4w",
  "custom",
]

export const SLA_CUSTOM_UNITS: SlaCustomUnit[] = [
  "hour",
  "day",
  "business_day",
  "week",
]

const PRIORITY_SET = new Set<string>(SLA_PRIORITIES)
const PRESET_SET = new Set<string>(SLA_DURATION_PRESETS)
const UNIT_SET = new Set<string>(SLA_CUSTOM_UNITS)

export function isSlaWorkWeek(value: unknown): value is SlaWorkWeek {
  return value === "mon_fri" || value === "sun_thu"
}

export function isSlaRuleId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

export function isSlaPriority(value: unknown): value is SlaPriority {
  return typeof value === "string" && PRIORITY_SET.has(value)
}

export function durationPresetLabel(preset: SlaDurationPreset) {
  switch (preset) {
    case "12h":
      return "12 hours"
    case "24h":
      return "24 hours"
    case "48h":
      return "48 hours"
    case "1w":
      return "1 week"
    case "2w":
      return "2 weeks"
    case "4w":
      return "4 weeks"
    case "custom":
      return "Custom time"
  }
}

export function parseSlaRuleFilters(
  input: unknown
): { data?: SlaRuleFilters; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid rule filters." }
  }
  const raw = input as Record<string, unknown>
  if (!Array.isArray(raw.priority) || raw.priority.length === 0) {
    return { error: "Pick at least one priority." }
  }
  const priority: SlaPriority[] = []
  for (const item of raw.priority) {
    if (!isSlaPriority(item)) return { error: "Invalid priority filter." }
    if (!priority.includes(item)) priority.push(item)
  }
  return { data: { priority } }
}

export function parseSlaRuleInput(
  input: unknown
): { data?: SlaRuleInput; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid SLA rule." }
  }
  const raw = input as Record<string, unknown>
  if (raw.action !== "add" && raw.action !== "remove") {
    return { error: "Pick whether to add or remove an SLA." }
  }
  const action = raw.action as SlaRuleAction

  const filters = parseSlaRuleFilters(raw.filters)
  if (filters.error || !filters.data) {
    return { error: filters.error ?? "Invalid rule filters." }
  }

  if (action === "remove") {
    return {
      data: {
        action,
        durationPreset: null,
        customAmount: null,
        customUnit: null,
        filters: filters.data,
      },
    }
  }

  if (typeof raw.durationPreset !== "string" || !PRESET_SET.has(raw.durationPreset)) {
    return { error: "Pick an SLA duration." }
  }
  const durationPreset = raw.durationPreset as SlaDurationPreset

  if (durationPreset !== "custom") {
    return {
      data: {
        action,
        durationPreset,
        customAmount: null,
        customUnit: null,
        filters: filters.data,
      },
    }
  }

  const amount =
    typeof raw.customAmount === "number"
      ? raw.customAmount
      : Number(raw.customAmount)
  if (!Number.isInteger(amount) || amount < 1 || amount > 365) {
    return { error: "Custom duration must be a whole number from 1 to 365." }
  }
  if (typeof raw.customUnit !== "string" || !UNIT_SET.has(raw.customUnit)) {
    return { error: "Pick a custom duration unit." }
  }

  return {
    data: {
      action,
      durationPreset,
      customAmount: amount,
      customUnit: raw.customUnit as SlaCustomUnit,
      filters: filters.data,
    },
  }
}

export function durationLabel(input: {
  action: SlaRuleAction
  durationPreset: SlaDurationPreset | null
  customAmount: number | null
  customUnit: SlaCustomUnit | null
}) {
  if (input.action === "remove") return "Remove SLA"
  switch (input.durationPreset) {
    case "12h":
      return "12 hours"
    case "24h":
      return "24 hours"
    case "48h":
      return "48 hours"
    case "1w":
      return "1 week"
    case "2w":
      return "2 weeks"
    case "4w":
      return "4 weeks"
    case "custom": {
      const amount = input.customAmount ?? 0
      const unit = input.customUnit ?? "day"
      const unitLabel =
        unit === "hour"
          ? amount === 1
            ? "hour"
            : "hours"
          : unit === "day"
            ? amount === 1
              ? "day"
              : "days"
            : unit === "business_day"
              ? amount === 1
                ? "business day"
                : "business days"
              : amount === 1
                ? "week"
                : "weeks"
      return `${amount} ${unitLabel}`
    }
    default:
      return "SLA"
  }
}

export function priorityLabel(priority: SlaPriority) {
  switch (priority) {
    case "urgent":
      return "Urgent"
    case "high":
      return "High"
    case "medium":
      return "Medium"
    case "low":
      return "Low"
    case "none":
      return "No priority"
  }
}

export function defaultSlaRules(): SlaRuleInput[] {
  return [
    {
      action: "add",
      durationPreset: "24h",
      filters: { priority: ["urgent"] },
    },
    {
      action: "add",
      durationPreset: "1w",
      filters: { priority: ["high"] },
    },
    {
      action: "remove",
      filters: { priority: ["medium", "low", "none"] },
    },
  ]
}
