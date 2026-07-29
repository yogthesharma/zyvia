import Link from "next/link"

import { siteConfig } from "@/lib/site"

const steps = ["profile", "workspace", "team", "theme", "invite"] as const

export function OnboardingShell({
  step,
  title,
  description,
  children,
}: {
  step: (typeof steps)[number]
  title: string
  description?: string
  children: React.ReactNode
}) {
  const index = steps.indexOf(step)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          Step {index + 1} of {steps.length}
        </p>
      </header>
      <div className="mx-auto h-1 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
