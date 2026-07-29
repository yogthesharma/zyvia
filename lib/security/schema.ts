export function parseApiKeyName(name: unknown): { name?: string; error?: string } {
  if (typeof name !== "string") return { error: "Enter a name for this API key." }
  const trimmed = name.trim().replace(/\s+/g, " ")
  if (!trimmed) return { error: "Enter a name for this API key." }
  if (trimmed.length > 80) return { error: "Name must be 80 characters or fewer." }
  return { name: trimmed }
}
