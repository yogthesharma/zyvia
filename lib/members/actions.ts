"use server"

import {
  isUuid,
  parseInviteEmails,
  parseInviteRole,
  parseTeamMemberRole,
} from "@/lib/members/schema"
import type { MembersActionResult } from "@/lib/members/types"
import { createClient } from "@/lib/supabase/server"
import type { WorkspaceRole } from "@/lib/workspace/types"

type Authed = {
  userId: string
  workspaceRole: WorkspaceRole
  deletionScheduledAt: string | null
  supabase: Awaited<ReturnType<typeof createClient>>
}

async function requireWorkspaceAccess(
  workspaceId: string,
  workspaceSlug: string
): Promise<Authed | { error: string }> {
  if (!isUuid(workspaceId)) return { error: "Workspace not found." }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "You must be signed in." }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("id", workspaceId)
    .maybeSingle()
  if (workspaceError) return { error: workspaceError.message }
  if (!workspace || workspace.slug !== workspaceSlug) {
    return { error: "Workspace not found." }
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (membershipError) return { error: membershipError.message }
  if (!membership) return { error: "You are not a member of this workspace." }

  return {
    userId: user.id,
    workspaceRole: membership.role as WorkspaceRole,
    deletionScheduledAt: workspace.deletion_scheduled_at,
    supabase,
  }
}

function isError(
  value: Authed | { error: string }
): value is { error: string } {
  return "error" in value
}

function canManageWorkspace(role: WorkspaceRole) {
  return role === "owner" || role === "admin"
}

async function loadTeamContext(
  auth: Authed,
  input: { workspaceId: string; teamId: string }
) {
  const { data: team, error: teamError } = await auth.supabase
    .from("teams")
    .select("id, workspace_id, deleted_at")
    .eq("id", input.teamId)
    .maybeSingle()
  if (teamError) return { error: teamError.message }
  if (!team || team.workspace_id !== input.workspaceId || team.deleted_at) {
    return { error: "Team not found." }
  }

  const { data: viewerTeam } = await auth.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", input.teamId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  const viewerTeamRole =
    (viewerTeam?.role as "owner" | "admin" | "member" | undefined) ?? null
  const canManage =
    canManageWorkspace(auth.workspaceRole) ||
    viewerTeamRole === "owner" ||
    viewerTeamRole === "admin"
  const canAssignOwner =
    canManageWorkspace(auth.workspaceRole) || viewerTeamRole === "owner"

  return { team, viewerTeamRole, canManage, canAssignOwner }
}

export async function createWorkspaceInvites(input: {
  workspaceId: string
  workspaceSlug: string
  emailsRaw: string
  role: string
}): Promise<MembersActionResult> {
  const auth = await requireWorkspaceAccess(
    input.workspaceId,
    input.workspaceSlug
  )
  if (isError(auth)) return auth
  if (!canManageWorkspace(auth.workspaceRole)) {
    return { error: "Only owners and admins can invite members." }
  }
  if (auth.deletionScheduledAt) {
    return { error: "This workspace is scheduled for deletion." }
  }

  const role = parseInviteRole(input.role)
  if (!role) return { error: "Invalid invite role." }

  const parsed = parseInviteEmails(input.emailsRaw)
  if (parsed.error) return { error: parsed.error }

  const { data: directory, error: directoryError } = await auth.supabase.rpc(
    "workspace_member_directory",
    { p_workspace_id: input.workspaceId }
  )
  if (directoryError) return { error: directoryError.message }

  const memberEmails = new Set(
    ((directory ?? []) as { email: string }[]).map((row) =>
      row.email.toLowerCase()
    )
  )

  const { data: pending, error: pendingError } = await auth.supabase
    .from("invites")
    .select("email")
    .eq("workspace_id", input.workspaceId)
    .eq("status", "pending")
  if (pendingError) return { error: pendingError.message }

  const pendingEmails = new Set(
    (pending ?? []).map((row) => row.email.toLowerCase())
  )

  const fresh = parsed.emails.filter(
    (email) => !memberEmails.has(email) && !pendingEmails.has(email)
  )
  const skippedCount = parsed.emails.length - fresh.length

  if (!fresh.length) {
    return {
      error:
        "Those emails are already members or have a pending invite.",
    }
  }

  const rows = fresh.map((email) => ({
    workspace_id: input.workspaceId,
    email,
    role,
    invited_by: auth.userId,
    status: "pending" as const,
  }))

  const { error } = await auth.supabase.from("invites").insert(rows)
  if (error) {
    if (error.code === "23505") {
      return { error: "One or more emails already have a pending invite." }
    }
    return { error: error.message }
  }

  return { invitedCount: rows.length, skippedCount }
}

export async function revokeWorkspaceInvite(input: {
  workspaceId: string
  workspaceSlug: string
  inviteId: string
}): Promise<MembersActionResult> {
  const auth = await requireWorkspaceAccess(
    input.workspaceId,
    input.workspaceSlug
  )
  if (isError(auth)) return auth
  if (!canManageWorkspace(auth.workspaceRole)) {
    return { error: "Only owners and admins can revoke invites." }
  }
  if (!isUuid(input.inviteId)) return { error: "Invite not found." }

  const { data, error } = await auth.supabase
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", input.inviteId)
    .eq("workspace_id", input.workspaceId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: "Invite not found." }
  return { revoked: true }
}

export async function addTeamMembers(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  userIds: string[]
  role?: string
}): Promise<MembersActionResult> {
  const auth = await requireWorkspaceAccess(
    input.workspaceId,
    input.workspaceSlug
  )
  if (isError(auth)) return auth
  if (!isUuid(input.teamId)) return { error: "Team not found." }

  const role = input.role == null ? "member" : parseTeamMemberRole(input.role)
  if (!role) return { error: "Invalid role." }
  if (role === "owner") {
    return { error: "Use transfer ownership instead of inviting as owner." }
  }

  const ctx = await loadTeamContext(auth, {
    workspaceId: input.workspaceId,
    teamId: input.teamId,
  })
  if ("error" in ctx) return { error: ctx.error }
  if (!ctx.canManage) {
    return { error: "Only team managers can add members." }
  }

  const uniqueIds = [...new Set(input.userIds.filter(isUuid))]
  if (!uniqueIds.length) return { error: "Select at least one member." }
  if (uniqueIds.length > 50) {
    return { error: "Add up to 50 members at a time." }
  }

  const { data: workspaceMembers, error: workspaceMembersError } =
    await auth.supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", input.workspaceId)
      .in("user_id", uniqueIds)
  if (workspaceMembersError) return { error: workspaceMembersError.message }

  const allowed = new Set((workspaceMembers ?? []).map((row) => row.user_id))
  const validIds = uniqueIds.filter((id) => allowed.has(id))
  if (!validIds.length) {
    return { error: "Those users are not in this workspace." }
  }

  const { data: existing } = await auth.supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", input.teamId)
    .in("user_id", validIds)
  const already = new Set((existing ?? []).map((row) => row.user_id))
  const toInsert = validIds.filter((id) => !already.has(id))
  if (!toInsert.length) {
    return { error: "Those people are already on this team." }
  }

  const { error } = await auth.supabase.from("team_members").insert(
    toInsert.map((userId) => ({
      team_id: input.teamId,
      user_id: userId,
      role,
    }))
  )
  if (error) return { error: error.message }

  return { addedCount: toInsert.length }
}

export async function removeTeamMember(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  userId: string
}): Promise<MembersActionResult> {
  const auth = await requireWorkspaceAccess(
    input.workspaceId,
    input.workspaceSlug
  )
  if (isError(auth)) return auth
  if (!isUuid(input.teamId) || !isUuid(input.userId)) {
    return { error: "Member not found." }
  }

  const ctx = await loadTeamContext(auth, {
    workspaceId: input.workspaceId,
    teamId: input.teamId,
  })
  if ("error" in ctx) return { error: ctx.error }

  const removingSelf = input.userId === auth.userId
  if (!removingSelf && !ctx.canManage) {
    return { error: "Only team managers can remove members." }
  }

  const { data: target } = await auth.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .maybeSingle()
  if (!target) return { error: "Member not found." }

  if (target.role === "owner") {
    const { count } = await auth.supabase
      .from("team_members")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", input.teamId)
      .eq("role", "owner")
    if ((count ?? 0) <= 1) {
      return { error: "Teams need at least one owner." }
    }
  }

  const { error } = await auth.supabase
    .from("team_members")
    .delete()
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
  if (error) return { error: error.message }

  return { removed: true }
}

export async function updateTeamMemberRole(input: {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  userId: string
  role: string
}): Promise<MembersActionResult> {
  const auth = await requireWorkspaceAccess(
    input.workspaceId,
    input.workspaceSlug
  )
  if (isError(auth)) return auth
  if (!isUuid(input.teamId) || !isUuid(input.userId)) {
    return { error: "Member not found." }
  }

  const role = parseTeamMemberRole(input.role)
  if (!role) return { error: "Invalid role." }

  const ctx = await loadTeamContext(auth, {
    workspaceId: input.workspaceId,
    teamId: input.teamId,
  })
  if ("error" in ctx) return { error: ctx.error }
  if (!ctx.canManage) {
    return { error: "Only team managers can change roles." }
  }
  if (role === "owner" && !ctx.canAssignOwner) {
    return { error: "Only team owners can assign ownership." }
  }

  const { data: target } = await auth.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .maybeSingle()
  if (!target) return { error: "Member not found." }
  if (target.role === role) return {}

  if (target.role === "owner" && role !== "owner") {
    const { count } = await auth.supabase
      .from("team_members")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", input.teamId)
      .eq("role", "owner")
    if ((count ?? 0) <= 1) {
      return { error: "Teams need at least one owner." }
    }
  }

  const { error } = await auth.supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
  if (error) return { error: error.message }

  return {}
}
