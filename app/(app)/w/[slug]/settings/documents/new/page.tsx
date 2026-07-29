import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { DocumentTemplateForm } from "@/components/settings/document-template-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getWorkspaceContextForDocuments } from "@/lib/documents/queries"
import { listWorkspaceMentionables } from "@/lib/workspace/mentionables"

export const metadata: Metadata = { title: "New document template" }

export default async function NewDocumentTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()

  try {
    const ctx = await getWorkspaceContextForDocuments(slug, user.id)
    if (!ctx) notFound()
    if (!ctx.canEdit) {
      redirect(`/w/${ctx.workspaceSlug}/settings/documents`)
    }

    const mentionables = await listWorkspaceMentionables(ctx.workspaceId)

    return (
      <DocumentTemplateForm
        workspaceId={ctx.workspaceId}
        workspaceSlug={ctx.workspaceSlug}
        canEdit={ctx.canEdit}
        mentionables={mentionables}
      />
    )
  } catch {
    notFound()
  }
}
