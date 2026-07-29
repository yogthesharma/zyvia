import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocumentTemplateForm } from "@/components/settings/document-template-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getDocumentTemplate } from "@/lib/documents/queries"
import { listWorkspaceMentionables } from "@/lib/workspace/mentionables"

export const metadata: Metadata = { title: "Edit document template" }

export default async function EditDocumentTemplatePage({
  params,
}: {
  params: Promise<{ slug: string; templateId: string }>
}) {
  const { slug, templateId } = await params
  const { user } = await requireCompletedOnboarding()

  try {
    const result = await getDocumentTemplate(slug, user.id, templateId)
    if (!result) notFound()

    const mentionables = await listWorkspaceMentionables(
      result.template.workspaceId
    )

    return (
      <DocumentTemplateForm
        workspaceId={result.template.workspaceId}
        workspaceSlug={slug}
        canEdit={result.canEdit}
        mentionables={mentionables}
        template={result.template}
      />
    )
  } catch {
    notFound()
  }
}
