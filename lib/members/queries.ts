import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { DEFAULT_TEAM_ICON } from "@/lib/teams/schema"
import type {
  PendingInviteRow,
  TeamMemberRow,
  TeamMembersPageData,
  WorkspaceMemberCandidate,
  WorkspaceMemberRow,
  WorkspaceMembersPageData,
} from "@/lib/members/types"
import type { WorkspaceRole } from "@/lib/workspace/types"
import { createClient } from "@/lib/supabase/server"

type DirectoryRow = {
  user_id: string
  email: string
  last_seen_at: string | null
}

type MembershipRow = {
  user_id: string
  role: WorkspaceRole
  created_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

type InviteRow = {
  id: string
  email: string
  role: "admin" | "member"
  created_at: string
}

type TeamMemberDbRow = {
  user_id: string
  role: "owner" | "admin" | "member"
  created_at: string
}

function displayName(profile: ProfileRow | undefined) {
  return (
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Member"
  )
}

async function loadDirectoryMap(workspaceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("workspace_member_directory", {
    p_workspace_id: workspaceId,
  })
  if (error) throw new Error(error.message)

  const map = new Map<string, DirectoryRow>()
  for (const row of (data ?? []) as DirectoryRow[]) {
    map.set(row.user_id, row)
  }
  return map
}

async function loadProfiles(userIds: string[]) {
  if (!userIds.length) return new Map<string, ProfileRow>()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds)
  if (error) throw new Error(error.message)

  const map = new Map<string, ProfileRow>()
  for (const row of (data ?? []) as ProfileRow[]) {
    map.set(row.id, row)
  }
  return map
}

async function loadTeamCounts(workspaceId: string, userIds: string[]) {
  const counts = new Map<string, number>()
  for (const id of userIds) counts.set(id, 0)
  if (!userIds.length) return counts

  const supabase = await createClient()
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
  if (teamsError) throw new Error(teamsError.message)

  const teamIds = (teams ?? []).map((team) => team.id)
  if (!teamIds.length) return counts

  const { data: memberships, error } = await supabase
    .from("team_members")
    .select("user_id")
    .in("team_id", teamIds)
    .in("user_id", userIds)
  if (error) throw new Error(error.message)

  for (const row of memberships ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
  }
  return counts
}

export async function getWorkspaceMembersPage(
  slug: string,
  userId: string
): Promise<WorkspaceMembersPageData | null> {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle()
  if (workspaceError) throw new Error(workspaceError.message)
  if (!workspace) return null

  const { data: viewer, error: viewerError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle()
  if (viewerError) throw new Error(viewerError.message)
  if (!viewer) return null

  const viewerRole = viewer.role as WorkspaceRole
  const canManage = viewerRole === "owner" || viewerRole === "admin"

  const [{ data: memberships, error: membersError }, { data: invites, error: invitesError }] =
    await Promise.all([
      supabase
        .from("workspace_members")
        .select("user_id, role, created_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("invites")
        .select("id, email, role, created_at")
        .eq("workspace_id", workspace.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ])

  if (membersError) throw new Error(membersError.message)
  if (invitesError) throw new Error(invitesError.message)

  const memberRows = (memberships ?? []) as MembershipRow[]
  const userIds = memberRows.map((row) => row.user_id)
  const [directory, profiles, teamCounts] = await Promise.all([
    loadDirectoryMap(workspace.id),
    loadProfiles(userIds),
    loadTeamCounts(workspace.id, userIds),
  ])

  const members: WorkspaceMemberRow[] = memberRows.map((row) => {
    const profile = profiles.get(row.user_id)
    const dir = directory.get(row.user_id)
    return {
      userId: row.user_id,
      fullName: displayName(profile),
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email: dir?.email ?? "",
      role: row.role,
      teamCount: teamCounts.get(row.user_id) ?? 0,
      joinedAt: row.created_at,
      lastSeenAt: dir?.last_seen_at ?? null,
    }
  })

  members.sort((a, b) => a.fullName.localeCompare(b.fullName))

  const pendingInvites: PendingInviteRow[] = ((invites ?? []) as InviteRow[]).map(
    (row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
    })
  )

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
    viewerRole,
    canManage,
    members,
    pendingInvites,
  }
}

export async function getWorkspaceMembersPageOrNull(
  slug: string,
  userId: string
): Promise<WorkspaceMembersPageData | null> {
  try {
    return await getWorkspaceMembersPage(slug, userId)
  } catch {
    return null
  }
}

export async function getTeamMembersPage(input: {
  slug: string
  teamKey: string
  userId: string
}): Promise<TeamMembersPageData | null> {
  if (!isValidWorkspaceSlug(input.slug)) return null
  const key = input.teamKey.trim().toUpperCase()
  if (!/^[A-Z]{2,4}$/.test(key)) return null

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug")
    .eq("slug", input.slug)
    .maybeSingle()
  if (workspaceError) throw new Error(workspaceError.message)
  if (!workspace) return null

  const { data: viewerWorkspace, error: viewerError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", input.userId)
    .maybeSingle()
  if (viewerError) throw new Error(viewerError.message)
  if (!viewerWorkspace) return null

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, key, icon")
    .eq("workspace_id", workspace.id)
    .eq("key", key)
    .is("deleted_at", null)
    .maybeSingle()
  if (teamError) throw new Error(teamError.message)
  if (!team) return null

  const { data: viewerTeam } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", input.userId)
    .maybeSingle()

  const viewerWorkspaceRole = viewerWorkspace.role as WorkspaceRole
  const viewerTeamRole =
    (viewerTeam?.role as TeamMembersPageData["viewerTeamRole"]) ?? null
  const canManage =
    viewerTeamRole === "owner" ||
    viewerTeamRole === "admin" ||
    viewerWorkspaceRole === "owner" ||
    viewerWorkspaceRole === "admin"

  const { data: teamMembers, error: teamMembersError } = await supabase
    .from("team_members")
    .select("user_id, role, created_at")
    .eq("team_id", team.id)
    .order("created_at", { ascending: true })
  if (teamMembersError) throw new Error(teamMembersError.message)

  const teamMemberRows = (teamMembers ?? []) as TeamMemberDbRow[]
  const memberIds = teamMemberRows.map((row) => row.user_id)

  const { data: workspaceMembers, error: workspaceMembersError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.id)
  if (workspaceMembersError) throw new Error(workspaceMembersError.message)

  const workspaceRoleByUser = new Map<string, WorkspaceRole>()
  for (const row of workspaceMembers ?? []) {
    workspaceRoleByUser.set(row.user_id, row.role as WorkspaceRole)
  }

  const allUserIds = [
    ...new Set([
      ...memberIds,
      ...(workspaceMembers ?? []).map((row) => row.user_id),
    ]),
  ]
  const [directory, profiles] = await Promise.all([
    loadDirectoryMap(workspace.id),
    loadProfiles(allUserIds),
  ])

  const members: TeamMemberRow[] = teamMemberRows.map((row) => {
    const profile = profiles.get(row.user_id)
    const dir = directory.get(row.user_id)
    return {
      userId: row.user_id,
      fullName: displayName(profile),
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email: dir?.email ?? "",
      teamRole: row.role,
      workspaceRole: workspaceRoleByUser.get(row.user_id) ?? "member",
      joinedAt: row.created_at,
    }
  })
  members.sort((a, b) => a.fullName.localeCompare(b.fullName))

  const onTeam = new Set(memberIds)
  const candidates: WorkspaceMemberCandidate[] = (workspaceMembers ?? [])
    .filter((row) => !onTeam.has(row.user_id))
    .map((row) => {
      const profile = profiles.get(row.user_id)
      const dir = directory.get(row.user_id)
      return {
        userId: row.user_id,
        fullName: displayName(profile),
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        email: dir?.email ?? "",
        workspaceRole: row.role as WorkspaceRole,
      }
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    teamId: team.id,
    teamKey: team.key,
    teamName: team.name,
    teamIcon: team.icon || DEFAULT_TEAM_ICON,
    viewerTeamRole,
    viewerWorkspaceRole,
    canManage,
    members,
    candidates,
  }
}

export async function getTeamMembersPageOrNull(input: {
  slug: string
  teamKey: string
  userId: string
}): Promise<TeamMembersPageData | null> {
  try {
    return await getTeamMembersPage(input)
  } catch {
    return null
  }
}
