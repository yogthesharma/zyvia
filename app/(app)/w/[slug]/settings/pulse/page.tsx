import type { Metadata } from "next"

import { ComingSoonPage } from "@/components/app/coming-soon"

export const metadata: Metadata = { title: "Pulse" }

export default function Page() {
  return <ComingSoonPage title="Pulse" />
}
