import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Import issues" }

export default function Page() {
  return (
    <ComingSoonPage
      title="Import issues"
      description="Navigation stub — wired like Linear, content lands next."
    />
  )
}
