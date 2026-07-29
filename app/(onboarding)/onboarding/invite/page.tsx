import type { Metadata } from "next"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { InviteStepForm } from "@/components/onboarding/invite-form"
import { ensureOnboardingStep } from "@/lib/onboarding/guard"

export const metadata: Metadata = { title: "Invite" }

export default async function OnboardingInvitePage() {
  await ensureOnboardingStep("invite")

  return (
    <OnboardingShell
      step="invite"
      title="Invite your team"
      description="Optional — skip and invite people later from settings."
    >
      <InviteStepForm />
    </OnboardingShell>
  )
}
