import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { OnboardingStep, Profile, Workspace } from "@/lib/types"

export async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/login")
  return data.user
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, username, title, theme, onboarding_step, onboarding_completed_at"
    )
    .eq("id", userId)
    .maybeSingle()
  return data
}

export async function requireProfile() {
  const user = await requireUser()
  const profile = await getProfile(user.id)
  if (!profile) redirect("/login")
  return { user, profile }
}

export function onboardingPath(step: OnboardingStep) {
  switch (step) {
    case "profile":
      return "/onboarding/profile"
    case "workspace":
      return "/onboarding/workspace"
    case "team":
      return "/onboarding/team"
    case "theme":
      return "/onboarding/theme"
    case "invite":
      return "/onboarding/invite"
    case "done":
      return null
  }
}

export async function getPrimaryWorkspace(
  userId: string
): Promise<Workspace | null> {
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_by")
    .eq("id", membership.workspace_id)
    .maybeSingle()

  return workspace
}

export async function requireCompletedOnboarding() {
  const { user, profile } = await requireProfile()
  if (profile.onboarding_step !== "done" || !profile.onboarding_completed_at) {
    const path = onboardingPath(profile.onboarding_step) ?? "/onboarding/profile"
    redirect(path)
  }
  return { user, profile }
}
