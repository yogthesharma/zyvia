"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { CaretLeftIcon, InfoIcon } from "@phosphor-icons/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Sticky top-left back control for settings subpages.
 * Sits in the scrolling main pane (see SettingsShell) without consuming layout height.
 */
export function SettingsBackLink({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <div className="pointer-events-none sticky top-0 z-20 h-0">
      <Link
        href={href}
        className="pointer-events-auto absolute top-4 left-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretLeftIcon className="size-3.5" />
        {label}
      </Link>
    </div>
  )
}

/** Wrapper for settings subpages that need a sticky back link. */
export function SettingsSubpage({
  backHref,
  backLabel,
  children,
  className,
}: {
  backHref: string
  backLabel: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative min-h-full", className)}>
      <SettingsBackLink href={backHref} label={backLabel} />
      {children}
    </div>
  )
}

export function SettingsPage({
  title,
  description,
  width = "narrow",
  children,
  className,
}: {
  title: string
  description?: string
  width?: "narrow" | "full"
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-8 pt-12 pb-8",
        width === "narrow" ? "max-w-3xl" : "max-w-none",
        className
      )}
    >
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-10">{children}</div>
    </div>
  )
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title?: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      {title || description ? (
        <div className="space-y-1">
          {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg bg-muted/20">
        {children}
      </div>
    </section>
  )
}

export function SettingsRow({
  label,
  description,
  tooltip,
  control,
  className,
}: {
  label: string
  description?: string
  tooltip?: string
  control: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">{label}</p>
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`About ${label}`}
                >
                  <InfoIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{tooltip}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-start sm:justify-end">
        {control}
      </div>
    </div>
  )
}
