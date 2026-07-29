import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TeamMembersSettings } from "@/components/settings/team-members-settings"
import { requireCompletedOnboarding } from "@/lib/auth/session"
import { getTeamMembersPageOrNull } from "@/lib/members/queries"

type PageProps = {
  params: Promise<{ slug: string; key: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { key } = await params
  return { title: `Members · ${key.toUpperCase()} · Team` }
}

export default async function TeamMembersSettingsPage({ params }: PageProps) {
  const { slug, key } = await params
  const { user } = await requireCompletedOnboarding()
  const data = await getTeamMembersPageOrNull({
    slug,
    teamKey: key,
    userId: user.id,
  })
  if (!data) notFound()

  return <TeamMembersSettings initial={data} viewerUserId={user.id} />
}
