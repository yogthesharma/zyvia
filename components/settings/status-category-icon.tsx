"use client"

import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  CircleIcon,
  CopySimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import type { StatusCategory, StatusKind } from "@/lib/statuses/types"
import { cn } from "@/lib/utils"

export function StatusCategoryIcon({
  kind,
  category,
  color,
  className,
}: {
  kind: StatusKind
  category: StatusCategory
  color: string
  className?: string
}) {
  const props = {
    className: cn("size-4 shrink-0", className),
    style: { color },
    weight: "bold" as const,
  }

  if (kind === "project" && category === "planned") {
    return <CircleIcon {...props} weight="regular" />
  }

  switch (category) {
    case "backlog":
      return <CircleDashedIcon {...props} />
    case "unstarted":
      return <CircleIcon {...props} weight="regular" />
    case "started":
      return <CircleHalfIcon {...props} />
    case "completed":
      return <CheckCircleIcon {...props} weight="fill" />
    case "canceled":
      return <XCircleIcon {...props} />
    case "duplicate":
      return <CopySimpleIcon {...props} />
    default:
      return <CircleIcon {...props} weight="regular" />
  }
}
