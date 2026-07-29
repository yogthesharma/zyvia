"use client"

import Link from "next/link"
import { PlusIcon } from "@phosphor-icons/react"

import {
  SettingsPage,
  SettingsSection,
} from "@/components/app/settings-page"
import { TeamIcon } from "@/components/app/team-icon"
import { Button } from "@/components/ui/button"
import type { TeamSummary } from "@/lib/teams/types"

export function TeamsSettingsList({
  workspaceSlug,
  teams,
}: {
  workspaceSlug: string
  teams: TeamSummary[]
}) {
  const createHref = `/w/${workspaceSlug}/settings/teams/new`

  return (
    <SettingsPage
      title="Teams"
      description="Manage teams in this workspace."
      width="narrow"
    >
      <div className="-mt-4 mb-6 flex justify-end">
        <Button asChild size="sm">
          <Link href={createHref}>
            <PlusIcon className="size-3.5" />
            Create team
          </Link>
        </Button>
      </div>

      <SettingsSection>
        {teams.length === 0 ? (
          <p className="px-4 py-3.5 text-sm text-muted-foreground">
            No teams yet. Create one to start tracking issues.
          </p>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                  <TeamIcon
                    icon={team.icon}
                    fallback={team.key}
                    className="size-4"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{team.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {team.key} · {team.timezone}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </SettingsSection>
    </SettingsPage>
  )
}
