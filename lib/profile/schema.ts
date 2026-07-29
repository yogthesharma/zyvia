import { isValidEmail } from "@/lib/validation"
import type { ProfileSettingsUpdate } from "@/lib/profile/types"

/** 2–30 chars, lowercase; start/end alphanumeric; _ and - allowed in the middle. */
const USERNAME_RE =
  /^(?:[a-z0-9]{2,30}|[a-z0-9][a-z0-9_-]{1,28}[a-z0-9])$/

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "help",
  "root",
  "system",
  "zyvia",
  "null",
  "undefined",
  "me",
  "settings",
  "profile",
  "api",
  "auth",
  "login",
  "signup",
  "onboarding",
])

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string) {
  const username = normalizeUsername(value)
  return USERNAME_RE.test(username) && !RESERVED_USERNAMES.has(username)
}

export function parseProfileUpdate(
  input: unknown
): { data?: ProfileSettingsUpdate; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid profile payload." }
  }

  const raw = input as Record<string, unknown>
  const data: ProfileSettingsUpdate = {}

  if ("fullName" in raw) {
    if (typeof raw.fullName !== "string") {
      return { error: "Invalid full name." }
    }
    const fullName = raw.fullName.trim().replace(/\s+/g, " ")
    if (!fullName) return { error: "Full name is required." }
    if (fullName.length > 80) return { error: "Full name is too long." }
    data.fullName = fullName
  }

  if ("title" in raw) {
    if (typeof raw.title !== "string") {
      return { error: "Invalid title." }
    }
    const title = raw.title.trim().replace(/\s+/g, " ")
    if (title.length > 80) return { error: "Title is too long." }
    data.title = title
  }

  if ("username" in raw) {
    if (typeof raw.username !== "string") {
      return { error: "Invalid username." }
    }
    const username = normalizeUsername(raw.username)
    if (!USERNAME_RE.test(username)) {
      return {
        error:
          "Username must be 2–30 characters: lowercase letters, numbers, _ or -.",
      }
    }
    if (RESERVED_USERNAMES.has(username)) {
      return { error: "That username is reserved." }
    }
    data.username = username
  }

  if (Object.keys(data).length === 0) {
    return { error: "No profile changes provided." }
  }

  return { data }
}

export function parseEmailChange(email: unknown): {
  email?: string
  error?: string
} {
  if (typeof email !== "string") return { error: "Enter a new email address." }
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { error: "Enter a new email address." }
  if (normalized.length > 254) return { error: "Email address is too long." }
  if (!isValidEmail(normalized)) return { error: "Enter a valid email address." }
  return { email: normalized }
}

export function isValidWorkspaceSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    slug.length >= 2 &&
    slug.length <= 48
  )
}
