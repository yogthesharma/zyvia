import { teamKeyFromName } from "@/lib/slug"

const ICON_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
  return { key }
}

export function parseTeamIcon(icon: unknown): { icon?: string | null; error?: string } {
  if (icon == null || icon === "") return { icon: null }
  if (typeof icon !== "string") return { error: "Invalid icon." }
  const trimmed = icon.trim()
  if (!trimmed) return { icon: null }
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
