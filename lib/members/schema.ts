import { isValidEmail } from "@/lib/validation"
import type { InviteRole, TeamMemberRole } from "@/lib/members/types"
import type { WorkspaceRole } from "@/lib/workspace/types"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID_RE.test(value)
}

export function parseInviteEmails(raw: string): {
  emails: string[]
  error?: string
} {
  const emails = [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]

  if (!emails.length) {
    return { emails: [], error: "Add at least one email." }
  }

  if (emails.length > 50) {
    return { emails: [], error: "Invite up to 50 emails at a time." }
  }

  const invalid = emails.filter((email) => !isValidEmail(email))
  if (invalid.length) {
    return {
      emails: [],
      error: `Invalid email(s): ${invalid.slice(0, 3).join(", ")}`,
    }
  }

  return { emails }
}

export function parseInviteRole(value: unknown): InviteRole | null {
  if (value === "admin" || value === "member") return value
  return null
}

export function parseTeamMemberRole(value: unknown): TeamMemberRole | null {
  if (value === "owner" || value === "admin" || value === "member") return value
  return null
}

export function workspaceRoleLabel(role: WorkspaceRole) {
  if (role === "owner") return "Owner"
  if (role === "admin") return "Admin"
  return "Member"
}

export function teamRoleDisplayLabel(input: {
  teamRole: TeamMemberRole
  workspaceRole: WorkspaceRole
}) {
  if (input.workspaceRole === "owner") return "Workspace owner"
  if (input.workspaceRole === "admin") return "Workspace admin"
  if (input.teamRole === "owner") return "Owner"
  if (input.teamRole === "admin") return "Admin"
  return "Member"
}

export function formatJoinedMonth(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function formatLastSeen(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  const ageMs = Date.now() - date.getTime()
  if (ageMs >= 0 && ageMs < 5 * 60 * 1000) return "Online"

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}
