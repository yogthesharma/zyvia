/** Client-safe display helpers (no Node crypto). */

export function parseUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "Unknown device"

  const ua = userAgent
  let browser = "Browser"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/Brave/i.test(ua)) browser = "Brave"
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari"

  let os = "Unknown OS"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  return `${browser} on ${os}`
}

export function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return "Never"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Unknown"
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
