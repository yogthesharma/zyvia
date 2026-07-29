"use server"

import { revalidatePath } from "next/cache"

import {
  documentTemplateInputsEqual,
  isDocumentTemplateId,
  parseDocumentTemplateBody,
  parseDocumentTemplateInput,
} from "@/lib/documents/schema"
import {
  getDocumentTemplate,
  mapDocumentTemplateRow,
} from "@/lib/documents/queries"
import type {
  DocumentTemplateActionResult,
  DocumentTemplateInput,
  DocumentTemplateRow,
} from "@/lib/documents/types"
import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { createClient } from "@/lib/supabase/server"
import type { WorkspaceRole } from "@/lib/workspace/types"

const DETAIL_SELECT =
  "id, workspace_id, team_id, name, icon, body_doc, body_text, created_by, updated_by, created_at, updated_at"

function documentsPath(workspaceSlug: string) {
  if (!isValidWorkspaceSlug(workspaceSlug)) return null
  return `/w/${workspaceSlug}/settings/documents`
}

async function requireDocumentsEditor(workspaceSlug: string) {
  if (!isValidWorkspaceSlug(workspaceSlug)) {
    return { error: "Invalid workspace." as const }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in." as const }
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("slug", workspaceSlug)
    .maybeSingle()

  if (workspaceError) return { error: workspaceError.message }
  if (!workspace) return { error: "Workspace not found." }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) return { error: membershipError.message }
  if (!membership) return { error: "Workspace not found." }

  const role = membership.role as WorkspaceRole
  if (workspace.deletion_scheduled_at) {
    return { error: "Workspace changes are locked while deletion is scheduled." }
  }
  if (role !== "owner" && role !== "admin") {
    return { error: "Only workspace admins can manage document templates." }
  }

  return {
    userId: user.id,
    supabase,
    workspaceId: workspace.id as string,
    workspaceSlug: workspace.slug as string,
  }
}

export async function createDocumentTemplate(
  workspaceSlug: string,
  input: DocumentTemplateInput
): Promise<DocumentTemplateActionResult> {
  try {
    const redirectTo = documentsPath(workspaceSlug)
    if (!redirectTo) return { error: "Invalid workspace." }

    const parsed = parseDocumentTemplateInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid template." }
    }

    const auth = await requireDocumentsEditor(workspaceSlug)
    if ("error" in auth) return { error: auth.error }

    const body = parseDocumentTemplateBody(parsed.data.bodyDoc)
    if (body.error || !body.bodyDoc) {
      return { error: body.error ?? "Invalid template body." }
    }

    // Workspace Documents settings only creates workspace-wide templates.
    const teamId = null

    const { data, error } = await auth.supabase
      .from("document_templates")
      .insert({
        workspace_id: auth.workspaceId,
        team_id: teamId,
        name: parsed.data.name,
        icon: parsed.data.icon,
        body_doc: isEmptyBody(body.bodyText) ? null : body.bodyDoc,
        body_text: body.bodyText ?? "",
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select(DETAIL_SELECT)
      .single()

    if (error) {
      if (error.code === "23514") {
        return { error: "Template could not be saved. Check name and body length." }
      }
      return { error: error.message }
    }

    revalidatePath(redirectTo)
    return {
      template: mapDocumentTemplateRow(data as DocumentTemplateRow),
      redirectTo,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create document template.",
    }
  }
}

export async function updateDocumentTemplate(
  workspaceSlug: string,
  templateId: string,
  input: DocumentTemplateInput
): Promise<DocumentTemplateActionResult> {
  try {
    const redirectTo = documentsPath(workspaceSlug)
    if (!redirectTo) return { error: "Invalid workspace." }
    if (!isDocumentTemplateId(templateId)) {
      return { error: "Template not found." }
    }

    const parsed = parseDocumentTemplateInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid template." }
    }

    const auth = await requireDocumentsEditor(workspaceSlug)
    if ("error" in auth) return { error: auth.error }

    const existing = await getDocumentTemplate(
      auth.workspaceSlug,
      auth.userId,
      templateId
    )
    if (!existing) return { error: "Template not found." }

    if (
      documentTemplateInputsEqual(parsed.data, {
        name: existing.template.name,
        icon: existing.template.icon,
        bodyDoc: existing.template.bodyDoc,
        teamId: existing.template.teamId,
      })
    ) {
      return { template: existing.template, redirectTo }
    }

    const body = parseDocumentTemplateBody(parsed.data.bodyDoc)
    if (body.error || !body.bodyDoc) {
      return { error: body.error ?? "Invalid template body." }
    }

    const { data, error } = await auth.supabase
      .from("document_templates")
      .update({
        name: parsed.data.name,
        icon: parsed.data.icon,
        body_doc: isEmptyBody(body.bodyText) ? null : body.bodyDoc,
        body_text: body.bodyText ?? "",
        updated_by: auth.userId,
      })
      .eq("id", templateId)
      .eq("workspace_id", auth.workspaceId)
      .select(DETAIL_SELECT)
      .maybeSingle()

    if (error) {
      if (error.code === "23514") {
        return { error: "Template could not be saved. Check name and body length." }
      }
      return { error: error.message }
    }
    if (!data) return { error: "Template not found." }

    revalidatePath(redirectTo)
    revalidatePath(`${redirectTo}/${templateId}`)
    return {
      template: mapDocumentTemplateRow(data as DocumentTemplateRow),
      redirectTo,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update document template.",
    }
  }
}

export async function deleteDocumentTemplate(
  workspaceSlug: string,
  templateId: string
): Promise<DocumentTemplateActionResult> {
  try {
    const redirectTo = documentsPath(workspaceSlug)
    if (!redirectTo) return { error: "Invalid workspace." }
    if (!isDocumentTemplateId(templateId)) {
      return { error: "Template not found." }
    }

    const auth = await requireDocumentsEditor(workspaceSlug)
    if ("error" in auth) return { error: auth.error }

    const { error } = await auth.supabase
      .from("document_templates")
      .delete()
      .eq("id", templateId)
      .eq("workspace_id", auth.workspaceId)

    if (error) return { error: error.message }

    revalidatePath(redirectTo)
    return { redirectTo }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not delete document template.",
    }
  }
}

function isEmptyBody(bodyText: string | undefined) {
  return !bodyText || bodyText.trim() === ""
}
