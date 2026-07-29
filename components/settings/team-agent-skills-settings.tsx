"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon } from "@phosphor-icons/react"

import {
  SettingsPage,
  SettingsSubpage,
} from "@/components/app/settings-page"
import { Button } from "@/components/ui/button"
import type { TeamAgentSkillsSettings } from "@/lib/agent-personalization/types"

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
  if (days < 45) {
    return `${prefix} ${days} ${days === 1 ? "day" : "days"} ago`
  }
  const months = Math.round(days / 30)
  if (months < 18) {
    return `${prefix} ${months} ${months === 1 ? "month" : "months"} ago`
  }
  const years = Math.round(days / 365)
  return `${prefix} ${years} ${years === 1 ? "year" : "years"} ago`
}

export function TeamAgentSkillsSettings({
  initialSettings,
}: {
  initialSettings: TeamAgentSkillsSettings
}) {
  const [settings, setSettings] = React.useState(initialSettings)

  React.useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  const hubHref = `/w/${settings.workspaceSlug}/settings/teams/${settings.teamKey.toLowerCase()}`
  const newHref = `${hubHref}/agent-skills/new`
  const baseSkillHref = `${hubHref}/agent-skills`

  return (
    <SettingsSubpage backHref={hubHref} backLabel={settings.teamName}>
      <SettingsPage
        title="Agent skills"
        description="Add reusable instructions team members can use with Zyvia Agent."
      >
        <div data-slot="surface" className="overflow-hidden rounded-lg">
          {settings.skills.length === 0 ? (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">No skills created</p>
              {settings.canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New skill"
                  asChild
                >
                  <Link href={newHref}>
                    <PlusIcon className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <ul>
                {settings.skills.map((skill) => {
                  const updated = formatRelativeTime(
                    skill.updatedAt,
                    "Updated"
                  )
                  return (
                    <li key={skill.id}>
                      <Link
                        href={`${baseSkillHref}/${skill.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {skill.name}
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
              {settings.canEdit ? (
                <div className="flex justify-end bg-background/50 px-2 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New skill"
                    asChild
                  >
                    <Link href={newHref}>
                      <PlusIcon className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {!settings.canEdit ? (
          <p className="text-sm text-muted-foreground">
            Viewing only. Team members and workspace admins can manage skills
            when the workspace is editable.
          </p>
        ) : null}
      </SettingsPage>
    </SettingsSubpage>
  )
}
