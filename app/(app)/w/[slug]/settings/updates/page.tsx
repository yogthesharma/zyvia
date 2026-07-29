import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Updates" }

export default function Page() {
  return <ComingSoonPage title="Updates" />
}
