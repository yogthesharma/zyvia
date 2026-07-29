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

  const { data: workspace } = await auth.supabase
    .from("workspaces")
    .select("deletion_scheduled_at")
    .eq("id", input.workspaceId)
    .maybeSingle()
  if (workspace?.deletion_scheduled_at) {
    return { error: "This workspace is scheduled for deletion." }
  }

  const role = parseInviteRole(input.role) ?? "member"
  const parsed = parseInviteEmails(input.emailsRaw)
  if (parsed.error) return { error: parsed.error }

  const { data: existingMembers } = await auth.supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", input.workspaceId)

  const memberIds = (existingMembers ?? []).map((row) => row.user_id)
  let memberEmails = new Set<string>()
  if (memberIds.length) {
    const { data: directory } = await auth.supabase.rpc(
      "workspace_member_directory",
      { p_workspace_id: input.workspaceId }
    )
    memberEmails = new Set(
      ((directory ?? []) as { email: string }[]).map((row) => row.email)
    )
  }

  const { data: pending } = await auth.supabase
    .from("invites")
    .select("email")
    .eq("workspace_id", input.workspaceId)
    .eq("status", "pending")
  const pendingEmails = new Set((pending ?? []).map((row) => row.email))

  const fresh = parsed.emails.filter(
    (email) => !memberEmails.has(email) && !pendingEmails.has(email)
  )
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

  return { invitedCount: rows.length }
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

  const role = parseTeamMemberRole(input.role) ?? "member"
  if (role === "owner") {
    return { error: "Use transfer ownership instead of inviting as owner." }
  }

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

  const canManage =
    canManageWorkspace(auth.workspaceRole) ||
    viewerTeam?.role === "owner" ||
    viewerTeam?.role === "admin"
  if (!canManage) {
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

  const removingSelf = input.userId === auth.userId
  const canManage =
    canManageWorkspace(auth.workspaceRole) ||
    viewerTeam?.role === "owner" ||
    viewerTeam?.role === "admin"

  if (!removingSelf && !canManage) {
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

  const canManage =
    canManageWorkspace(auth.workspaceRole) ||
    viewerTeam?.role === "owner" ||
    viewerTeam?.role === "admin"
  if (!canManage) {
    return { error: "Only team managers can change roles." }
  }

  const { data: target } = await auth.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .maybeSingle()
  if (!target) return { error: "Member not found." }

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
