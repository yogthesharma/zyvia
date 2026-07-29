import type { Metadata } from "next"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { ProfileStepForm } from "@/components/onboarding/profile-form"
import { ensureOnboardingStep } from "@/lib/onboarding/guard"

export const metadata: Metadata = { title: "Your name" }

export default async function OnboardingProfilePage() {
  const profile = await ensureOnboardingStep("profile")

  return (
    <OnboardingShell
      step="profile"
      title="What’s your name?"
      description="This is how teammates will see you in Zyvia."
    >
      <ProfileStepForm defaultName={profile.full_name ?? undefined} />
    </OnboardingShell>
  )
}
