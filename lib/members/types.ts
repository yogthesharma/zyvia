import type { WorkspaceRole } from "@/lib/workspace/types"

export type InviteRole = "admin" | "member"
export type TeamMemberRole = "owner" | "admin" | "member"
export type InviteStatus = "pending" | "accepted" | "revoked"

export type WorkspaceMemberRow = {
  userId: string
  fullName: string
  username: string | null
  avatarUrl: string | null
  email: string
  role: WorkspaceRole
  teamCount: number
  joinedAt: string
  lastSeenAt: string | null
}

export type PendingInviteRow = {
  id: string
  email: string
  role: InviteRole
  createdAt: string
}

export type TeamMemberRow = {
  userId: string
  fullName: string
  username: string | null
  avatarUrl: string | null
  email: string
  teamRole: TeamMemberRole
  workspaceRole: WorkspaceRole
  joinedAt: string
}

export type WorkspaceMemberCandidate = {
  userId: string
  fullName: string
  username: string | null
  avatarUrl: string | null
  email: string
  workspaceRole: WorkspaceRole
}

export type WorkspaceMembersPageData = {
  workspaceId: string
  workspaceSlug: string
  workspaceName: string
  viewerRole: WorkspaceRole
  canManage: boolean
  members: WorkspaceMemberRow[]
  pendingInvites: PendingInviteRow[]
}

export type TeamMembersPageData = {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  teamKey: string
  teamName: string
  teamIcon: string
  viewerTeamRole: TeamMemberRole | null
  viewerWorkspaceRole: WorkspaceRole
  canManage: boolean
  members: TeamMemberRow[]
  candidates: WorkspaceMemberCandidate[]
}

export type MembersActionResult = {
  error?: string
  invitedCount?: number
  revoked?: boolean
  addedCount?: number
  removed?: boolean
}
