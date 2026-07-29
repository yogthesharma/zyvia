import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.name,
  },
  description: siteConfig.description,
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.04_250_/_0.35),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.28_0.05_250_/_0.55),_transparent_55%)]"
      />
      <header className="relative z-10 flex h-14 items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          Project management for product teams
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
          A Linear-like system for issues, teams, and workflows — built for speed and
          clarity.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
