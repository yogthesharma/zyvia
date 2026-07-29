import type { Metadata } from "next"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { ThemeStepForm } from "@/components/onboarding/theme-form"
import { ensureOnboardingStep } from "@/lib/onboarding/guard"

export const metadata: Metadata = { title: "Theme" }

export default async function OnboardingThemePage() {
  const profile = await ensureOnboardingStep("theme")

  return (
    <OnboardingShell
      step="theme"
      title="Choose a theme"
      description="You can change this anytime in settings."
    >
      <ThemeStepForm defaultTheme={profile.theme} />
    </OnboardingShell>
  )
}
