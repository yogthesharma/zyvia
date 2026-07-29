import { notFound } from "next/navigation"

import { WorkspaceChrome } from "@/components/app/workspace-chrome"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user, profile } = await requireCompletedOnboarding()
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_by")
    .eq("slug", slug)
    .maybeSingle()

  if (!workspace) notFound()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) notFound()

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, key")
    .eq("workspace_id", workspace.id)
    .order("name")

  return (
    <WorkspaceChrome
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      }}
      teams={teams ?? []}
      user={{ email: user.email, fullName: profile.full_name }}
    >
      {children}
    </WorkspaceChrome>
  )
}
