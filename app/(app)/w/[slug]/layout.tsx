import { notFound } from "next/navigation"

import { AppShell } from "@/components/app/app-shell"
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

  return (
    <AppShell
      workspace={{ name: workspace.name, slug: workspace.slug }}
      user={{ email: user.email, fullName: profile.full_name }}
    >
      {children}
    </AppShell>
  )
}
