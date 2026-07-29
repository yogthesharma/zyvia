/** Curated IANA timezones for the create-team picker. */
export const TEAM_TIMEZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const

export function detectDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export function formatTimezoneLabel(timeZone: string) {
  try {
    const now = new Date()
    const offsetParts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(now)
    const offset =
      offsetParts.find((part) => part.type === "timeZoneName")?.value ?? "GMT"

    const city = timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone
    let longName = city
    try {
      const longParts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "long",
      }).formatToParts(now)
      longName =
        longParts.find((part) => part.type === "timeZoneName")?.value ?? city
    } catch {
      // keep city
    }

    return `${offset} - ${longName} - ${city}`
  } catch {
    return timeZone
  }
}

export function timezoneOptions(preferred?: string | null) {
  const set = new Set<string>(TEAM_TIMEZONES)
  if (preferred) set.add(preferred)
  return [...set].sort((a, b) =>
    formatTimezoneLabel(a).localeCompare(formatTimezoneLabel(b))
  )
}
