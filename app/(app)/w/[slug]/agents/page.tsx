import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Agents" }

export default function Page() {
  return (
    <ComingSoonPage
      title="Agents"
      description="Main app agent workspace lands here next."
    />
  )
}
