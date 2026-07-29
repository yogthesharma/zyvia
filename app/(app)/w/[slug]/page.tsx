import { redirect } from "next/navigation"

import {
  getPrimaryWorkspace,
  onboardingPath,
  requireProfile,
} from "@/lib/auth/session"

export default async function WorkspaceIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { profile } = await requireProfile()
  if (profile.onboarding_step !== "done") {
    redirect(onboardingPath(profile.onboarding_step) ?? "/onboarding/profile")
  }
  const workspace = await getPrimaryWorkspace(profile.id)
  if (workspace && workspace.slug !== slug) {
    redirect(`/w/${workspace.slug}/issues`)
  }
  redirect(`/w/${slug}/issues`)
}
