import { teamKeyFromName } from "@/lib/slug"
import type {
  TeamEstimationScale,
  TeamLifecycleStatus,
  TeamVisibility,
} from "@/lib/teams/types"

const ICON_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const VISIBILITY = new Set<TeamVisibility>(["workspace", "private"])
const ESTIMATION = new Set<TeamEstimationScale>([
  "none",
  "exponential",
  "fibonacci",
  "linear",
  "tshirt",
])

/** Default Lucide icon name when a team has no custom icon. */
export const DEFAULT_TEAM_ICON = "users"

export function teamLifecycleStatus(input: {
  retiredAt: string | null
  deletedAt: string | null
}): TeamLifecycleStatus {
  if (input.deletedAt) return "deleted"
  if (input.retiredAt) return "retired"
  return "active"
}

export function parseTeamVisibility(
  value: unknown
): { visibility?: TeamVisibility; error?: string } {
  if (typeof value !== "string" || !VISIBILITY.has(value as TeamVisibility)) {
    return { error: "Pick a valid visibility." }
  }
  return { visibility: value as TeamVisibility }
}

export function parseTeamEstimationScale(
  value: unknown
): { estimationScale?: TeamEstimationScale; error?: string } {
  if (
    typeof value !== "string" ||
    !ESTIMATION.has(value as TeamEstimationScale)
  ) {
    return { error: "Pick a valid estimation scale." }
  }
  return { estimationScale: value as TeamEstimationScale }
}

export function parseTeamName(name: unknown): { name?: string; error?: string } {
  if (typeof name !== "string") return { error: "Enter a team name." }
  const trimmed = name.trim().replace(/\s+/g, " ")
  if (!trimmed) return { error: "Enter a team name." }
  if (trimmed.length > 80) return { error: "Name must be 80 characters or fewer." }
  return { name: trimmed }
}

export function parseTeamKey(
  keyInput: unknown,
  nameForFallback?: string
): { key?: string; error?: string } {
  let key =
    typeof keyInput === "string"
      ? keyInput.trim().toUpperCase().replace(/[^A-Z]/g, "")
      : ""

  if (!key && nameForFallback) key = teamKeyFromName(nameForFallback)

  if (key.length < 2 || key.length > 4) {
    return { error: "Identifier must be 2–4 letters." }
  }
  if (key === "NEW") {
    return { error: "That identifier is reserved." }
  }
  return { key }
}

export function parseTeamIcon(icon: unknown): { icon?: string; error?: string } {
  if (icon == null || icon === "") return { icon: DEFAULT_TEAM_ICON }
  if (typeof icon !== "string") return { error: "Invalid icon." }
  const trimmed = icon.trim()
  if (!trimmed) return { icon: DEFAULT_TEAM_ICON }
  if (trimmed.length > 64 || !ICON_NAME_RE.test(trimmed)) {
    return { error: "Invalid icon." }
  }
  return { icon: trimmed }
}

export function parseTeamTimezone(timezone: unknown): {
  timezone?: string
  error?: string
} {
  if (typeof timezone !== "string") return { error: "Pick a timezone." }
  const trimmed = timezone.trim()
  if (!trimmed) return { error: "Pick a timezone." }
  if (trimmed.length > 64) return { error: "Pick a valid timezone." }
  try {
    // Invalid IANA names throw RangeError in modern engines.
    Intl.DateTimeFormat(undefined, { timeZone: trimmed }).format(new Date())
  } catch {
    return { error: "Pick a valid timezone." }
  }
  return { timezone: trimmed }
}

export const MAX_TEAM_DESCRIPTION_LENGTH = 500

export function parseTeamDescription(description: unknown): {
  description?: string
  error?: string
} {
  if (description == null) return { description: "" }
  if (typeof description !== "string") {
    return { error: "Enter a valid description." }
  }
  const trimmed = description.trim()
  if (trimmed.length > MAX_TEAM_DESCRIPTION_LENGTH) {
    return {
      error: `Description must be ${MAX_TEAM_DESCRIPTION_LENGTH} characters or fewer.`,
    }
  }
  return { description: trimmed }
}

export function parseTeamBoolean(
  value: unknown,
  label: string
): { value?: boolean; error?: string } {
  if (typeof value !== "boolean") {
    return { error: `Pick a valid ${label} setting.` }
  }
  return { value }
}

export function estimationScaleLabel(scale: TeamEstimationScale) {
  switch (scale) {
    case "none":
      return "Not in use"
    case "exponential":
      return "Exponential"
    case "fibonacci":
      return "Fibonacci"
    case "linear":
      return "Linear"
    case "tshirt":
      return "T-shirt"
    default:
      return scale
  }
}
