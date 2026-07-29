"use client"

import { dynamicIconImports, type IconName } from "lucide-react/dynamic"

import { Icon } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"

export function asRenderableIcon(
  value: string | null | undefined
): IconName | null {
  if (!value) return null
  if (value in dynamicIconImports) return value as IconName
  return null
}

export function TeamIcon({
  icon,
  fallback,
  className,
}: {
  icon?: string | null
  fallback: string
  className?: string
}) {
  const iconName = asRenderableIcon(icon)
  if (iconName) {
    return <Icon name={iconName} className={cn("size-3.5 shrink-0", className)} />
  }

  return (
    <span
      className={cn(
        "flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-emerald-500/20 text-[9px] font-semibold text-emerald-400",
        className
      )}
    >
      {fallback.slice(0, 1)}
    </span>
  )
}
