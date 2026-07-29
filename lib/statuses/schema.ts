import type {
  IssueStatusCategory,
  ProjectStatusCategory,
  StatusCategory,
  StatusCreateInput,
  StatusKind,
  StatusUpdateInput,
} from "@/lib/statuses/types"
import {
  DEFAULT_LABEL_COLOR,
  LABEL_COLOR_PRESETS,
  normalizeLabelColor,
} from "@/lib/labels/schema"

export const MAX_STATUS_NAME_LENGTH = 80
export const MAX_STATUS_DESCRIPTION_LENGTH = 500

export const DEFAULT_STATUS_COLOR = DEFAULT_LABEL_COLOR
export const STATUS_COLOR_PRESETS = LABEL_COLOR_PRESETS

export const ISSUE_STATUS_CATEGORIES = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
  "duplicate",
] as const satisfies readonly IssueStatusCategory[]

export const PROJECT_STATUS_CATEGORIES = [
  "backlog",
  "planned",
  "started",
  "completed",
  "canceled",
] as const satisfies readonly ProjectStatusCategory[]

export const ISSUE_CATEGORY_LABELS: Record<IssueStatusCategory, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  canceled: "Canceled",
  duplicate: "Duplicate",
}

export const PROJECT_CATEGORY_LABELS: Record<ProjectStatusCategory, string> = {
  backlog: "Backlog",
  planned: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
}

export const DEFAULT_ISSUE_STATUS_COLOR: Record<IssueStatusCategory, string> = {
  backlog: "#94a3b8",
  unstarted: "#a78bfa",
  started: "#60a5fa",
  completed: "#34d399",
  canceled: "#f87171",
  duplicate: "#94a3b8",
}

export const DEFAULT_PROJECT_STATUS_COLOR: Record<
  ProjectStatusCategory,
  string
> = {
  backlog: "#94a3b8",
  planned: "#a78bfa",
  started: "#60a5fa",
  completed: "#34d399",
  canceled: "#f87171",
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isStatusId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function isStatusKind(value: unknown): value is StatusKind {
  return value === "issue" || value === "project"
}

export function isIssueStatusCategory(
  value: unknown
): value is IssueStatusCategory {
  return (
    typeof value === "string" &&
    (ISSUE_STATUS_CATEGORIES as readonly string[]).includes(value)
  )
}

export function isProjectStatusCategory(
  value: unknown
): value is ProjectStatusCategory {
  return (
    typeof value === "string" &&
    (PROJECT_STATUS_CATEGORIES as readonly string[]).includes(value)
  )
}

export function categoriesForKind(kind: StatusKind): readonly StatusCategory[] {
  return kind === "issue" ? ISSUE_STATUS_CATEGORIES : PROJECT_STATUS_CATEGORIES
}

export function categoryLabel(kind: StatusKind, category: StatusCategory) {
  if (kind === "issue" && isIssueStatusCategory(category)) {
    return ISSUE_CATEGORY_LABELS[category]
  }
  if (kind === "project" && isProjectStatusCategory(category)) {
    return PROJECT_CATEGORY_LABELS[category]
  }
  return category
}

export function defaultColorForCategory(
  kind: StatusKind,
  category: StatusCategory
) {
  if (kind === "issue" && isIssueStatusCategory(category)) {
    return DEFAULT_ISSUE_STATUS_COLOR[category]
  }
  if (kind === "project" && isProjectStatusCategory(category)) {
    return DEFAULT_PROJECT_STATUS_COLOR[category]
  }
  return DEFAULT_STATUS_COLOR
}

export function normalizeStatusName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function normalizeStatusDescription(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function normalizeStatusColor(value: string) {
  return normalizeLabelColor(value)
}

export function parseStatusCreateInput(
  kind: StatusKind,
  input: StatusCreateInput
): { error: string } | { data: Required<StatusCreateInput> } {
  const categories = categoriesForKind(kind)
  if (!(categories as readonly string[]).includes(input.category)) {
    return { error: "Invalid status category." }
  }

  const name = normalizeStatusName(input.name ?? "")
  if (!name) return { error: "Enter a status name." }
  if (name.length > MAX_STATUS_NAME_LENGTH) {
    return { error: `Name must be ${MAX_STATUS_NAME_LENGTH} characters or fewer.` }
  }

  const description = normalizeStatusDescription(input.description ?? "")
  if (description.length > MAX_STATUS_DESCRIPTION_LENGTH) {
    return {
      error: `Description must be ${MAX_STATUS_DESCRIPTION_LENGTH} characters or fewer.`,
    }
  }

  const colorRaw = input.color?.trim()
    ? input.color
    : defaultColorForCategory(kind, input.category)
  const color = normalizeStatusColor(colorRaw)
  if (!color) return { error: "Enter a valid hex color." }

  return {
    data: {
      category: input.category,
      name,
      description,
      color,
    },
  }
}

export function parseStatusUpdateInput(
  input: StatusUpdateInput
): { error: string } | { data: StatusUpdateInput } {
  const data: StatusUpdateInput = {}

  if (input.name !== undefined) {
    const name = normalizeStatusName(input.name)
    if (!name) return { error: "Enter a status name." }
    if (name.length > MAX_STATUS_NAME_LENGTH) {
      return {
        error: `Name must be ${MAX_STATUS_NAME_LENGTH} characters or fewer.`,
      }
    }
    data.name = name
  }

  if (input.description !== undefined) {
    const description = normalizeStatusDescription(input.description)
    if (description.length > MAX_STATUS_DESCRIPTION_LENGTH) {
      return {
        error: `Description must be ${MAX_STATUS_DESCRIPTION_LENGTH} characters or fewer.`,
      }
    }
    data.description = description
  }

  if (input.color !== undefined) {
    const color = normalizeStatusColor(input.color)
    if (!color) return { error: "Enter a valid hex color." }
    data.color = color
  }

  if (input.isDefault !== undefined) {
    data.isDefault = Boolean(input.isDefault)
  }

  if (Object.keys(data).length === 0) {
    return { error: "Nothing to update." }
  }

  return { data }
}

export function uniqueConstraintMessage(message: string) {
  if (/workflow_states_team_name_unique|project_statuses_workspace_name_unique/i.test(message)) {
    return "A status with that name already exists."
  }
  if (/one_default/i.test(message)) {
    return "Only one default status is allowed."
  }
  return message
}

export function nextAvailableStatusName(base: string, existing: string[]) {
  const taken = new Set(existing.map((name) => name.toLowerCase()))
  const root = normalizeStatusName(base) || "New status"
  if (!taken.has(root.toLowerCase())) return root
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root} ${i}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  return `${root} ${Date.now()}`
}

/** True when a draft matches the committed status after normalize. */
export function statusDraftUnchanged(
  existing: { name: string; description: string; color: string },
  draft: { name: string; description: string; color: string }
) {
  const color = normalizeStatusColor(draft.color)
  return (
    normalizeStatusName(draft.name) === existing.name &&
    normalizeStatusDescription(draft.description) === existing.description &&
    (color ?? "") === existing.color
  )
}
