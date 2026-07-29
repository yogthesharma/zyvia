"use client"

import Link from "next/link"
import { PlusIcon } from "@phosphor-icons/react"

import {
  SettingsPage,
  SettingsSection,
} from "@/components/app/settings-page"
import { Icon } from "@/components/ui/icon-picker"
import { Button } from "@/components/ui/button"
import type { DocumentTemplatesPage } from "@/lib/documents/types"
import type { IconName } from "@/components/ui/icon-picker"

function formatRelativeTime(iso: string | null, prefix: string) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null

  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 45) return `${prefix} just now`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${prefix} ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${prefix} ${hours} ${hours === 1 ? "hour" : "hours"} ago`
  }
  const days = Math.round(hours / 24)
  if (days < 30) {
    return `${prefix} ${days} ${days === 1 ? "day" : "days"} ago`
  }
  return `${prefix} ${new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`
}

export function DocumentsSettings({
  page,
}: {
  page: DocumentTemplatesPage
}) {
  const newHref = `/w/${page.workspaceSlug}/settings/documents/new`
  const baseHref = `/w/${page.workspaceSlug}/settings/documents`

  return (
    <SettingsPage title="Documents">
      <SettingsSection
        title="Templates"
        description="These templates are available when creating documents for any team in the workspace. To create templates that only apply to specific teams, add them as team templates."
        framed={false}
      >
        <div className="overflow-hidden rounded-lg bg-muted/40">
          {page.templates.length === 0 ? (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                No document templates
              </p>
              {page.canEdit ? (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={newHref}>
                    <PlusIcon className="size-3.5" />
                    New template
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <ul>
                {page.templates.map((template) => {
                  const updated = formatRelativeTime(
                    template.updatedAt,
                    "Updated"
                  )
                  return (
                    <li key={template.id}>
                      <Link
                        href={`${baseHref}/${template.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            name={template.icon as IconName}
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          <span className="min-w-0 truncate font-medium">
                            {template.name}
                          </span>
                        </span>
                        {updated ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {updated}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {page.canEdit ? (
                <div className="flex justify-end bg-background/50 px-2 py-1.5">
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <Link href={newHref}>
                      <PlusIcon className="size-3.5" />
                      New template
                    </Link>
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
