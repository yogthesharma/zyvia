"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getPrimaryWorkspace, onboardingPath } from "@/lib/auth/session"
import { safeInternalPath } from "@/lib/validation"

export type AuthState = {
  error?: string
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!fullName || !email || password.length < 8) {
    return { error: "Name, email, and a password (8+ chars) are required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) return { error: error.message }

  if (!data.session) {
    return {
      error:
        "Account created. Confirm your email, then sign in to continue onboarding.",
    }
  }

  redirect("/onboarding/profile")
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const next = safeInternalPath(String(formData.get("next") ?? ""))

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed_at")
    .eq("id", data.user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_step !== "done") {
    redirect(
      onboardingPath(profile?.onboarding_step ?? "profile") ??
        "/onboarding/profile"
    )
  }

  if (next?.startsWith("/w/") || next?.startsWith("/onboarding")) {
    redirect(next)
  }

  const workspace = await getPrimaryWorkspace(data.user.id)
  redirect(workspace ? `/w/${workspace.slug}/issues` : "/onboarding/workspace")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
