import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ProfileForm } from "@/components/settings/profile-form"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getProfileSettings } from "@/lib/profile/queries"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Profile" }

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
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

  const profile = await getProfileSettings(user.id, user.email ?? "")

  return (
    <ProfileForm
      initialProfile={profile}
      workspaceSlug={workspace.slug}
      workspaceName={workspace.name}
    />
  )
}
