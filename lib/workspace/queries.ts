import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { siteConfig } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"
import type {
  WorkspaceRole,
  WorkspaceSettings,
} from "@/lib/workspace/types"

function urlPrefixFromSite() {
  try {
    const host = new URL(siteConfig.url).host
    return host ? `${host}/` : "zyvia.app/"
  } catch {
    return "zyvia.app/"
  }
}

/** If `slug` is a former workspace URL, return the workspace's current slug. */
export async function getCurrentSlugForAlias(
  slug: string
): Promise<string | null> {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    "current_workspace_slug_for_alias",
    { p_slug: slug }
  )

  if (error) throw new Error(error.message)
  return typeof data === "string" && data.length > 0 ? data : null
}

export async function getWorkspaceSettings(
  slug: string,
  userId: string
): Promise<WorkspaceSettings | null> {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(
      "id, name, slug, logo_url, fiscal_year_start_month, region, deletion_scheduled_at"
    )
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!workspace) return null

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership) return null

  const role = membership.role as WorkspaceRole
  const deletionLocked = Boolean(workspace.deletion_scheduled_at)
  const canEdit =
    (role === "owner" || role === "admin") && !deletionLocked
  const canDelete = role === "owner"

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    logoUrl: workspace.logo_url,
    fiscalYearStartMonth: workspace.fiscal_year_start_month,
    region: workspace.region,
    deletionScheduledAt: workspace.deletion_scheduled_at,
    role,
    canEdit,
    canDelete,
    urlPrefix: urlPrefixFromSite(),
  }
}
