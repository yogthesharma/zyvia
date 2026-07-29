import { redirect } from "next/navigation"

import {
  getPrimaryWorkspace,
  requireProfile,
} from "@/lib/auth/session"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireProfile()

  if (profile.onboarding_step === "done" && profile.onboarding_completed_at) {
    const workspace = await getPrimaryWorkspace(profile.id)
    redirect(workspace ? `/w/${workspace.slug}/issues` : "/")
  }

  return children
}
