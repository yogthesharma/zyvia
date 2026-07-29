import type { Metadata } from "next"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { TeamStepForm } from "@/components/onboarding/team-form"
import { ensureOnboardingStep } from "@/lib/onboarding/guard"

export const metadata: Metadata = { title: "Team" }

export default async function OnboardingTeamPage() {
  await ensureOnboardingStep("team")

  return (
    <OnboardingShell
      step="team"
      title="Create your first team"
      description="Teams own issues and workflow. You can add more later."
    >
      <TeamStepForm />
    </OnboardingShell>
  )
}
