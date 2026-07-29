import type { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/lib/site"

export const metadata: Metadata = { title: "Terms" }

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed">
      <Link href="/" className="font-semibold">
        {siteConfig.name}
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Terms</h1>
      <p className="mt-4 text-muted-foreground">
        Placeholder terms of service for Zyvia. Replace with your real terms before
        launch.
      </p>
    </div>
  )
}
