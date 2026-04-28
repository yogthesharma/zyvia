import db from '@adonisjs/lucid/services/db'

export type WorkspaceSummary = {
  name: string
  slug: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export async function resolveWorkspacesForUser(userId: number): Promise<WorkspaceSummary[]> {
  const rows = await db
    .from('workspace_members')
    .innerJoin('workspaces', 'workspace_members.workspace_id', 'workspaces.id')
    .where('workspace_members.user_id', userId)
    .orderBy('workspace_members.id', 'asc')
    .select('workspaces.name', 'workspaces.slug')

  return rows.map((row) => ({
    name: row.name as string,
    slug: row.slug as string,
  }))
}

export async function resolveFirstWorkspaceSlugForUser(userId: number): Promise<string | null> {
  const [firstWorkspace] = await resolveWorkspacesForUser(userId)
  return firstWorkspace?.slug ?? null
}

export async function hasWorkspaceAccess(userId: number, workspaceSlug: string): Promise<boolean> {
  const membership = await db
    .from('workspace_members')
    .innerJoin('workspaces', 'workspace_members.workspace_id', 'workspaces.id')
    .where('workspace_members.user_id', userId)
    .where('workspaces.slug', workspaceSlug)
    .first()

  return Boolean(membership)
}

export async function resolveWorkspaceRoleForUser(
  userId: number,
  workspaceSlug: string
): Promise<WorkspaceRole | null> {
  const membership = await db
    .from('workspace_members')
    .innerJoin('workspaces', 'workspace_members.workspace_id', 'workspaces.id')
    .where('workspace_members.user_id', userId)
    .where('workspaces.slug', workspaceSlug)
    .select('workspace_members.role')
    .first()

  return (membership?.role as WorkspaceRole | undefined) ?? null
}

export async function hasWorkspaceRole(
  userId: number,
  workspaceSlug: string,
  allowedRoles: WorkspaceRole[]
): Promise<boolean> {
  const role = await resolveWorkspaceRoleForUser(userId, workspaceSlug)
  return role ? allowedRoles.includes(role) : false
}
