import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "Page not found",
}

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.04_250_/_0.35),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.28_0.05_250_/_0.55),_transparent_55%)]"
      />
      <header className="relative z-10 flex h-14 items-center px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-24">
        <p className="font-mono text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-3 text-base text-muted-foreground text-pretty">
          The link may be broken, or the page may have been moved. Head home and
          pick up where you left off.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
