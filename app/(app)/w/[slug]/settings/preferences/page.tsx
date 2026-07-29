import type { Metadata } from "next"

import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = { title: "Preferences" }

export default function PreferencesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Preferences</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Personal interface settings for your Zyvia account.
      </p>
      <Separator className="my-6" />

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Interface and theme</h2>
        <p className="text-sm text-muted-foreground">
          Theme follows your selection from onboarding and the{" "}
          <kbd className="rounded border border-border px-1 text-xs">d</kbd>{" "}
          hotkey. Deeper preference controls land here next.
        </p>
      </section>
    </div>
  )
}
