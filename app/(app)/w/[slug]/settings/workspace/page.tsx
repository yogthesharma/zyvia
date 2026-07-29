import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/app/settings-page"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Workspace" }

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, slug")
    .eq("slug", slug)
    .maybeSingle()

  if (!workspace) notFound()

  return (
    <SettingsPage
      title="Workspace"
      description="General workspace settings."
      width="narrow"
    >
      <SettingsSection title="Details">
        <SettingsRow
          label="Name"
          description="Displayed across the workspace."
          control={<p className="text-sm font-medium">{workspace.name}</p>}
        />
        <SettingsRow
          label="Slug"
          description="Used in workspace URLs."
          control={
            <p className="font-mono text-sm font-medium">{workspace.slug}</p>
          }
        />
      </SettingsSection>
    </SettingsPage>
  )
}
