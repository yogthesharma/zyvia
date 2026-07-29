import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocumentsSettings } from "@/components/settings/documents-settings"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getDocumentTemplatesPage } from "@/lib/documents/queries"

export const metadata: Metadata = { title: "Documents" }

export default async function DocumentsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()

  try {
    const page = await getDocumentTemplatesPage(slug, user.id)
    if (!page) notFound()
    return <DocumentsSettings page={page} />
  } catch {
    notFound()
  }
}
