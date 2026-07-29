import type { Metadata } from "next"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { WorkspaceStepForm } from "@/components/onboarding/workspace-form"
import { ensureOnboardingStep } from "@/lib/onboarding/guard"

export const metadata: Metadata = { title: "Workspace" }

export default async function OnboardingWorkspacePage() {
  await ensureOnboardingStep("workspace")

  return (
    <OnboardingShell
      step="workspace"
      title="Name your workspace"
      description="Usually your company or product name."
    >
      <WorkspaceStepForm />
    </OnboardingShell>
  )
}
