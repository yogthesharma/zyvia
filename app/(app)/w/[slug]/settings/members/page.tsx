import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MembersSettingsList } from "@/components/settings/members-settings-list"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getWorkspaceMembersPageOrNull } from "@/lib/members/queries"

export const metadata: Metadata = { title: "Members" }

export default async function MembersSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()
  const data = await getWorkspaceMembersPageOrNull(slug, user.id)
  if (!data) notFound()

  return <MembersSettingsList initial={data} />
}
