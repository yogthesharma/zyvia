"use server"

import { redirect } from "next/navigation"

import { requireProfile } from "@/lib/auth/session"
import { slugify, teamKeyFromName } from "@/lib/slug"
import { createClient } from "@/lib/supabase/server"
import type { OnboardingStep } from "@/lib/types"

export type OnboardingState = {
  error?: string
}

async function setStep(userId: string, step: OnboardingStep) {
  const supabase = await createClient()
  const payload =
    step === "done"
      ? {
          onboarding_step: step,
          onboarding_completed_at: new Date().toISOString(),
        }
      : { onboarding_step: step }

  await supabase.from("profiles").update(payload).eq("id", userId)
}

export async function saveProfileName(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { user } = await requireProfile()
  const fullName = String(formData.get("fullName") ?? "").trim()
  if (!fullName) return { error: "Please enter your name." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, onboarding_step: "workspace" })
    .eq("id", user.id)

  if (error) return { error: error.message }
  redirect("/onboarding/workspace")
}

export async function saveWorkspace(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { user } = await requireProfile()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { error: "Workspace name is required." }

  let slug = slugify(String(formData.get("slug") ?? name))
  if (slug.length < 2) slug = `ws-${user.id.slice(0, 6)}`

  const supabase = await createClient()

  let { error: workspaceError } = await supabase.rpc("create_workspace", {
    p_name: name,
    p_slug: slug,
  })

  if (workspaceError?.code === "23505") {
    const retry = await supabase.rpc("create_workspace", {
      p_name: name,
      p_slug: `${slug}-${user.id.slice(0, 4)}`,
    })
    workspaceError = retry.error
  }

  if (workspaceError) return { error: workspaceError.message }

  await setStep(user.id, "team")
  redirect("/onboarding/team")
}

export async function saveTeam(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { user } = await requireProfile()
  const name = String(formData.get("name") ?? "").trim()
  let key = String(formData.get("key") ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")

  if (!name) return { error: "Team name is required." }
  if (!key) key = teamKeyFromName(name)
  if (key.length < 2 || key.length > 4) {
    return { error: "Team key must be 2–4 letters." }
  }

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) return { error: "Create a workspace first." }

  const { error } = await supabase.from("teams").insert({
    workspace_id: membership.workspace_id,
    name,
    key,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "That team key is already taken in this workspace." }
    }
    return { error: error.message }
  }

  await setStep(user.id, "theme")
  redirect("/onboarding/theme")
}

export async function saveTheme(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { user } = await requireProfile()
  const theme = String(formData.get("theme") ?? "dark")
  if (!["light", "dark", "system"].includes(theme)) {
    return { error: "Pick a theme." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ theme, onboarding_step: "invite" })
    .eq("id", user.id)

  if (error) return { error: error.message }
  redirect("/onboarding/invite")
}

export async function saveInvites(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { user } = await requireProfile()
  const raw = String(formData.get("emails") ?? "")
  const skip = formData.get("skip") === "1"

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) return { error: "Create a workspace first." }

  if (!skip && raw.trim()) {
    const emails = [
      ...new Set(
        raw
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@"))
      ),
    ]

    if (emails.length) {
      const rows = emails.map((email) => ({
        workspace_id: membership.workspace_id,
        email,
        role: "member" as const,
        invited_by: user.id,
      }))
      const { error } = await supabase.from("invites").insert(rows)
      if (error) return { error: error.message }
    }
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", membership.workspace_id)
    .single()

  await setStep(user.id, "done")
  redirect(`/w/${workspace?.slug ?? "app"}/issues`)
}
