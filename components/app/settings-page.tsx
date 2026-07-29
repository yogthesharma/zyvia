"use client"

import { InfoIcon } from "@phosphor-icons/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-8 py-8",
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
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/40">
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
        "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
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
