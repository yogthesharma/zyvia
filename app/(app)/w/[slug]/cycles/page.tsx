import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Cycles" }

export default function Page() {
  return (
    <ComingSoonPage
      title="Cycles"
      description="Navigation stub — wired like Linear, content lands next."
    />
  )
}
