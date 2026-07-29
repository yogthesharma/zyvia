import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Initiatives" }

export default function Page() {
  return (
    <ComingSoonPage
      title="Initiatives"
      description="Navigation stub — wired like Linear, content lands next."
    />
  )
}
