export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

export function teamKeyFromName(name: string) {
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase()
  if (letters.length >= 2) return letters.slice(0, 3)
  return "ENG"
}
