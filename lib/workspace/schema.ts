import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { slugify } from "@/lib/slug"
import type { WorkspaceSettingsUpdate } from "@/lib/workspace/types"

const MONTHS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

export function normalizeWorkspaceName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

/** Keep only slug-safe characters while the user types. */
export function sanitizeSlugInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "")
}

/**
 * Turn a raw URL field into a valid slug, falling back to the workspace name.
 */
export function resolveWorkspaceSlugInput(
  rawSlug: string,
  fallbackName: string
): { slug?: string; error?: string } {
  let slug = slugify(rawSlug)
  if (!slug) slug = slugify(fallbackName)

  if (!slug) {
    return { error: "Workspace URL is required." }
  }
  if (!isValidWorkspaceSlug(slug)) {
    return {
      error:
        "URL must be 2–48 characters: lowercase letters, numbers, and hyphens.",
    }
  }
  return { slug }
}

export function parseWorkspaceUpdate(
  input: unknown
): { data?: WorkspaceSettingsUpdate; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid workspace payload." }
  }

  const raw = input as Record<string, unknown>
  const data: WorkspaceSettingsUpdate = {}

  if ("name" in raw) {
    if (typeof raw.name !== "string") return { error: "Invalid name." }
    const name = normalizeWorkspaceName(raw.name)
    if (!name) return { error: "Workspace name is required." }
    if (name.length > 80) return { error: "Workspace name is too long." }
    data.name = name
  }

  if ("slug" in raw) {
    if (typeof raw.slug !== "string") return { error: "Invalid URL." }
    const resolved = resolveWorkspaceSlugInput(raw.slug, "")
    if (resolved.error || !resolved.slug) {
      return {
        error:
          resolved.error ??
          "URL must be 2–48 characters: lowercase letters, numbers, and hyphens.",
      }
    }
    data.slug = resolved.slug
  }

  if ("fiscalYearStartMonth" in raw) {
    const month =
      typeof raw.fiscalYearStartMonth === "number"
        ? raw.fiscalYearStartMonth
        : Number(raw.fiscalYearStartMonth)
    if (!Number.isInteger(month) || !MONTHS.has(month)) {
      return { error: "Pick a valid fiscal year start month." }
    }
    data.fiscalYearStartMonth = month
  }

  if (Object.keys(data).length === 0) {
    return { error: "No workspace changes provided." }
  }

  return { data }
}
