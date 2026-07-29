import type { Metadata } from "next"

import { ConnectedAccounts } from "@/components/settings/connected-accounts"

export const metadata: Metadata = { title: "Connected accounts" }

export default function Page() {
  return <ConnectedAccounts />
}
