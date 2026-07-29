import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Team home" }

export default async function Page({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  return (
    <ComingSoonPage
      title={`${key.toUpperCase()} home`}
      description="Team home stub — matches Linear’s team Home item."
    />
  )
}
