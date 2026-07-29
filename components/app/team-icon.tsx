"use client"

import { dynamicIconImports, type IconName } from "lucide-react/dynamic"

import { Icon } from "@/components/ui/icon-picker"
import { DEFAULT_TEAM_ICON } from "@/lib/teams/schema"
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
  className,
}: {
  icon?: string | null
  className?: string
}) {
  const iconName =
    asRenderableIcon(icon) ??
    asRenderableIcon(DEFAULT_TEAM_ICON) ??
    ("users" as IconName)

  return (
    <Icon
      name={iconName}
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
    />
  )
}
