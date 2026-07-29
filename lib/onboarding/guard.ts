import { redirect } from "next/navigation"

import {
  getPrimaryWorkspace,
  onboardingPath,
  requireProfile,
} from "@/lib/auth/session"
import type { OnboardingStep } from "@/lib/types"

export async function ensureOnboardingStep(expected: OnboardingStep) {
  const { profile } = await requireProfile()

  if (profile.onboarding_step === "done" && profile.onboarding_completed_at) {
    const workspace = await getPrimaryWorkspace(profile.id)
    redirect(workspace ? `/w/${workspace.slug}/issues` : "/")
  }

  if (profile.onboarding_step !== expected) {
    redirect(onboardingPath(profile.onboarding_step) ?? "/onboarding/profile")
  }

  return profile
}
