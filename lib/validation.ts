export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** Only allow same-origin relative paths (open-redirect safe). */
export function safeInternalPath(next: string | null | undefined) {
  if (!next) return null
  if (!next.startsWith("/")) return null
  if (next.startsWith("//")) return null
  if (next.includes("\\") || next.includes("://")) return null
  return next
}
