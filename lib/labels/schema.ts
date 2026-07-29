import type {
  LabelCreateInput,
  LabelKind,
  LabelScopeFilter,
  LabelUpdateInput,
} from "@/lib/labels/types"

export const MAX_LABEL_NAME_LENGTH = 80
export const MAX_LABEL_DESCRIPTION_LENGTH = 500
export const MAX_LABELS_PER_GROUP = 250

export const LABEL_COLOR_PRESETS = [
  "#95a2b3",
  "#8b5cf6",
  "#4ea7fc",
  "#26b5ce",
  "#4cb782",
  "#f2c94c",
  "#f2994a",
  "#eb5757",
  "#f472b6",
  "#5e6ad2",
] as const

export const DEFAULT_LABEL_COLOR = LABEL_COLOR_PRESETS[0]

/** Reserved names that collide with core issue fields (case-insensitive). */
export const RESERVED_LABEL_NAMES = [
  "assignee",
  "cycle",
  "effort",
  "estimate",
  "hours",
  "priority",
  "project",
  "state",
  "status",
] as const

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export function isLabelId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function isLabelKind(value: unknown): value is LabelKind {
  return value === "issue" || value === "project"
}

export function isLabelScopeFilter(value: unknown): value is LabelScopeFilter {
  return (
    value === "workspace" ||
    value === "workspace_and_teams" ||
    value === "archived"
  )
}

export function normalizeLabelName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function normalizeLabelDescription(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function normalizeLabelColor(value: string) {
  const trimmed = value.trim()
  if (!HEX_COLOR_RE.test(trimmed)) return null
  return trimmed.toLowerCase()
}

export function isReservedLabelName(name: string) {
  const key = name.trim().toLowerCase()
  return (RESERVED_LABEL_NAMES as readonly string[]).includes(key)
}

export function randomLabelColor(): string {
  const index = Math.floor(Math.random() * LABEL_COLOR_PRESETS.length)
  return LABEL_COLOR_PRESETS[index] ?? DEFAULT_LABEL_COLOR
}

export function parseLabelCreateInput(
  input: unknown,
  options?: { kind?: LabelKind }
): { data?: LabelCreateInput; error?: string } {
  if (input != null && typeof input !== "object") {
    return { error: "Invalid label payload." }
  }

  const raw = (input ?? {}) as Record<string, unknown>
  const isGroup = Boolean(raw.isGroup)

  let name = "New label"
  if (typeof raw.name === "string") {
    name = normalizeLabelName(raw.name)
  }
  if (isGroup && (raw.name == null || raw.name === "")) {
    name = "New group"
  }
  if (!name) return { error: "Name is required." }
  if (name.length > MAX_LABEL_NAME_LENGTH) {
    return { error: "Name is too long." }
  }

  if (
    !isGroup &&
    options?.kind === "issue" &&
    isReservedLabelName(name)
  ) {
    return {
      error: `"${name}" is reserved and cannot be used as a label name.`,
    }
  }

  let description = ""
  if (typeof raw.description === "string") {
    description = normalizeLabelDescription(raw.description)
  }
  if (description.length > MAX_LABEL_DESCRIPTION_LENGTH) {
    return { error: "Description is too long." }
  }

  let color = randomLabelColor()
  if (typeof raw.color === "string" && raw.color.trim()) {
    const parsed = normalizeLabelColor(raw.color)
    if (!parsed) return { error: "Color must be a hex value like #eb5757." }
    color = parsed
  }

  let parentId: string | null = null
  if (raw.parentId != null && raw.parentId !== "") {
    if (!isLabelId(raw.parentId)) return { error: "Invalid group." }
    parentId = raw.parentId
  }

  if (isGroup && parentId) {
    return { error: "Groups cannot be nested." }
  }

  return {
    data: {
      name,
      description: isGroup ? "" : description,
      color: isGroup ? DEFAULT_LABEL_COLOR : color,
      parentId,
      isGroup,
    },
  }
}

export function parseLabelUpdateInput(
  input: unknown,
  options?: { kind?: LabelKind; isGroup?: boolean }
): { data?: LabelUpdateInput; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid label payload." }
  }

  const raw = input as Record<string, unknown>
  const data: LabelUpdateInput = {}

  if ("name" in raw) {
    if (typeof raw.name !== "string") return { error: "Invalid name." }
    const name = normalizeLabelName(raw.name)
    if (!name) return { error: "Name is required." }
    if (name.length > MAX_LABEL_NAME_LENGTH) {
      return { error: "Name is too long." }
    }
    if (
      !options?.isGroup &&
      options?.kind === "issue" &&
      isReservedLabelName(name)
    ) {
      return {
        error: `"${name}" is reserved and cannot be used as a label name.`,
      }
    }
    data.name = name
  }

  if ("description" in raw) {
    if (typeof raw.description !== "string") {
      return { error: "Invalid description." }
    }
    const description = normalizeLabelDescription(raw.description)
    if (description.length > MAX_LABEL_DESCRIPTION_LENGTH) {
      return { error: "Description is too long." }
    }
    data.description = description
  }

  if ("color" in raw) {
    if (typeof raw.color !== "string") return { error: "Invalid color." }
    const color = normalizeLabelColor(raw.color)
    if (!color) return { error: "Color must be a hex value like #eb5757." }
    data.color = color
  }

  if ("parentId" in raw) {
    if (raw.parentId == null || raw.parentId === "") {
      data.parentId = null
    } else if (!isLabelId(raw.parentId)) {
      return { error: "Invalid group." }
    } else {
      data.parentId = raw.parentId
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: "No changes." }
  }

  return { data }
}

export function uniqueConstraintMessage(errorMessage: string) {
  if (
    errorMessage.includes("labels_sibling_name_unique") ||
    errorMessage.includes("duplicate key")
  ) {
    return "A label with that name already exists here."
  }
  if (errorMessage.includes("limited to 250")) {
    return "Label groups are limited to 250 labels."
  }
  if (errorMessage.includes("reserved")) {
    return errorMessage
  }
  return errorMessage
}

/** Pick an unused sibling name: "New label", "New label 2", … */
export function nextAvailableLabelName(
  existing: { name: string; parentId: string | null; teamId: string | null }[],
  baseName: string,
  parentId: string | null,
  teamId: string | null
) {
  const base = normalizeLabelName(baseName) || "New label"
  const taken = new Set(
    existing
      .filter(
        (label) => label.parentId === parentId && label.teamId === teamId
      )
      .map((label) => label.name.toLowerCase())
  )
  if (!taken.has(base.toLowerCase())) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} ${i}`
    if (candidate.length > MAX_LABEL_NAME_LENGTH) break
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  const fallback = `${base} ${Date.now()}`
  return fallback.slice(0, MAX_LABEL_NAME_LENGTH)
}
