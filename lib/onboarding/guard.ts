import { redirect } from "next/navigation"

import {
  getPrimaryWorkspace,
  onboardingPath,
  requireProfile,
} from "@/lib/auth/session"
import { getWorkspaceHomePath } from "@/lib/preferences/queries"
import type { OnboardingStep } from "@/lib/types"

export async function ensureOnboardingStep(expected: OnboardingStep) {
  const { profile } = await requireProfile()

  if (profile.onboarding_step === "done" && profile.onboarding_completed_at) {
    const workspace = await getPrimaryWorkspace(profile.id)
    if (!workspace) redirect("/")
    redirect(await getWorkspaceHomePath(profile.id, workspace.slug))
  }

  if (profile.onboarding_step !== expected) {
    redirect(onboardingPath(profile.onboarding_step) ?? "/onboarding/profile")
  }

  return profile
}
