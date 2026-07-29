import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import {
  DEFAULT_DOCUMENT_TEMPLATE_ICON,
  isDocumentTemplateId,
  parseDocumentTemplateIcon,
} from "@/lib/documents/schema"
import type {
  DocumentTemplate,
  DocumentTemplateRow,
  DocumentTemplateSummary,
  DocumentTemplatesPage,
} from "@/lib/documents/types"
import { EMPTY_DOC, parseRichDoc } from "@/lib/rich-editor/schema"
import type { WorkspaceRole } from "@/lib/workspace/types"
import { createClient } from "@/lib/supabase/server"

const SUMMARY_SELECT = "id, name, icon, updated_at"
const DETAIL_SELECT =
  "id, workspace_id, team_id, name, icon, body_doc, body_text, created_by, updated_by, created_at, updated_at"

export function mapDocumentTemplateRow(row: DocumentTemplateRow): DocumentTemplate {
  const icon =
    parseDocumentTemplateIcon(row.icon).icon ?? DEFAULT_DOCUMENT_TEMPLATE_ICON
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    teamId: row.team_id,
    name: row.name,
    icon,
    bodyDoc: row.body_doc == null ? EMPTY_DOC : parseRichDoc(row.body_doc),
    bodyText: row.body_text ?? "",
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSummary(row: {
  id: string
  name: string
  icon: string
  updated_at: string
}): DocumentTemplateSummary {
  return {
    id: row.id,
    name: row.name,
    icon:
      parseDocumentTemplateIcon(row.icon).icon ?? DEFAULT_DOCUMENT_TEMPLATE_ICON,
    updatedAt: row.updated_at,
  }
}

export async function getDocumentTemplatesPage(
  slug: string,
  userId: string
): Promise<DocumentTemplatesPage | null> {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("slug", slug)
    .maybeSingle()

  if (workspaceError) throw new Error(workspaceError.message)
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

  const { data: rows, error: templatesError } = await supabase
    .from("document_templates")
    .select(SUMMARY_SELECT)
    .eq("workspace_id", workspace.id)
    .is("team_id", null)
    .order("updated_at", { ascending: false })

  if (templatesError) throw new Error(templatesError.message)

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    role,
    canEdit,
    templates: (rows ?? []).map(mapSummary),
  }
}

export async function getDocumentTemplate(
  slug: string,
  userId: string,
  templateId: string
): Promise<{ template: DocumentTemplate; canEdit: boolean } | null> {
  if (!isValidWorkspaceSlug(slug) || !isDocumentTemplateId(templateId)) {
    return null
  }

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("slug", slug)
    .maybeSingle()

  if (workspaceError) throw new Error(workspaceError.message)
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

  const { data, error } = await supabase
    .from("document_templates")
    .select(DETAIL_SELECT)
    .eq("id", templateId)
    .eq("workspace_id", workspace.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    template: mapDocumentTemplateRow(data as DocumentTemplateRow),
    canEdit,
  }
}

export async function getWorkspaceContextForDocuments(
  slug: string,
  userId: string
): Promise<{
  workspaceId: string
  workspaceSlug: string
  canEdit: boolean
} | null> {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("slug", slug)
    .maybeSingle()

  if (workspaceError) throw new Error(workspaceError.message)
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

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    canEdit,
  }
}
