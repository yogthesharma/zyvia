import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WorkspaceForm } from "@/components/settings/workspace-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getWorkspaceSettings } from "@/lib/workspace/queries"

export const metadata: Metadata = { title: "Workspace" }

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()
  const workspace = await getWorkspaceSettings(slug, user.id)

  if (!workspace) notFound()

  return <WorkspaceForm initialWorkspace={workspace} />
}
