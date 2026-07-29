import type { RichDoc } from "@/lib/rich-editor/types"
import type { WorkspaceRole } from "@/lib/workspace/types"

export type DocumentTemplate = {
  id: string
  workspaceId: string
  teamId: string | null
  name: string
  icon: string
  bodyDoc: RichDoc
  bodyText: string
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type DocumentTemplateSummary = {
  id: string
  name: string
  icon: string
  updatedAt: string
}

export type DocumentTemplatesPage = {
  workspaceId: string
  workspaceSlug: string
  role: WorkspaceRole
  canEdit: boolean
  templates: DocumentTemplateSummary[]
}

export type DocumentTemplateInput = {
  name: string
  icon: string
  bodyDoc: RichDoc
  /** Reserved for team-scoped templates; omit / null = workspace-wide. */
  teamId?: string | null
}

export type DocumentTemplateActionResult = {
  error?: string
  template?: DocumentTemplate
  redirectTo?: string
}

export type DocumentTemplateRow = {
  id: string
  workspace_id: string
  team_id: string | null
  name: string
  icon: string
  body_doc: unknown | null
  body_text: string
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}
