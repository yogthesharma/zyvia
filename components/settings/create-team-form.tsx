"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  SettingsRow,
  SettingsSection,
  SettingsSubpage,
} from "@/components/app/settings-page"
import { Button } from "@/components/ui/button"
import { Icon, IconPicker, type IconName } from "@/components/ui/icon-picker"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTeam } from "@/lib/teams/actions"
import { DEFAULT_TEAM_ICON } from "@/lib/teams/schema"
import { teamKeyFromName } from "@/lib/slug"
import {
  detectDefaultTimezone,
  formatTimezoneLabel,
  timezoneOptions,
} from "@/lib/teams/timezones"
import type { TeamSummary } from "@/lib/teams/types"

const TOAST_ID = "create-team"
const DEFAULT_ICON: IconName = DEFAULT_TEAM_ICON as IconName

export function CreateTeamForm({
  workspaceId,
  workspaceSlug,
  existingTeams,
}: {
  workspaceId: string
  workspaceSlug: string
  existingTeams: TeamSummary[]
}) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [key, setKey] = React.useState("")
  const [keyTouched, setKeyTouched] = React.useState(false)
  const [icon, setIcon] = React.useState<IconName>(DEFAULT_ICON)
  const [timezone, setTimezone] = React.useState(detectDefaultTimezone)
  const [copyFrom, setCopyFrom] = React.useState<string>("none")
  const [pending, setPending] = React.useState(false)

  const zones = React.useMemo(() => timezoneOptions(timezone), [timezone])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    try {
      const result = await createTeam({
        workspaceId,
        workspaceSlug,
        name,
        key,
        icon,
        timezone,
        copyFromTeamId: copyFrom === "none" ? null : copyFrom,
      })
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.warning) {
        toast.message(result.warning, { id: TOAST_ID })
      } else {
        toast.success("Team created", { id: TOAST_ID })
      }
      router.push(`/w/${workspaceSlug}/settings/teams`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create team.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <SettingsSubpage
      backHref={`/w/${workspaceSlug}/settings/teams`}
      backLabel="Back"
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-3xl px-8 pt-12 pb-8"
      >
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">
            Create a new team
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new team to manage separate cycles, workflows, and
            notifications.
          </p>
        </header>

        <div className="space-y-10">
          <SettingsSection>
            <SettingsRow
              label="Icon & Name"
              control={
                <div className="flex h-8 w-full max-w-sm items-stretch gap-2">
                  <IconPicker
                    value={icon}
                    onValueChange={(next) => setIcon(next)}
                    searchable
                    categorized
                    modal
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label="Choose team icon"
                    >
                      <Icon name={icon} className="size-4" />
                    </Button>
                  </IconPicker>
                  <Input
                    value={name}
                    placeholder="e.g. Engineering"
                    maxLength={80}
                    disabled={pending}
                    className="h-8 flex-1"
                    autoFocus
                    onChange={(event) => {
                      const next = event.target.value
                      setName(next)
                      if (!keyTouched) setKey(teamKeyFromName(next))
                    }}
                  />
                </div>
              }
            />
            <SettingsRow
              label="Identifier"
              description="Used to identify issues from this team (e.g. ENG-123)"
              control={
                <Input
                  value={key}
                  placeholder="e.g. ENG"
                  maxLength={4}
                  disabled={pending}
                  className="h-8 w-28 uppercase"
                  onChange={(event) => {
                    setKeyTouched(true)
                    setKey(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 4)
                    )
                  }}
                />
              }
            />
            <SettingsRow
              label="Parent team"
              control={
                <span className="text-sm text-muted-foreground">
                  Available on Business
                </span>
              }
            />
          </SettingsSection>

          <SettingsSection title="Team access">
            <div className="px-4 py-3.5">
              <p className="text-sm text-muted-foreground">
                Control who can access the team and its content. Private teams
                are visible only to team members and workspace admins.
              </p>
            </div>
            <SettingsRow
              label="Change team access"
              control={
                <span className="text-sm text-muted-foreground">
                  Available on Business
                </span>
              }
            />
          </SettingsSection>

          <SettingsSection title="Timezone">
            <div className="px-4 py-3.5">
              <p className="text-sm text-muted-foreground">
                Used for team schedules, dates, and cycle start times.
              </p>
            </div>
            <SettingsRow
              label="Timezone"
              control={
                <Select
                  value={timezone}
                  disabled={pending}
                  onValueChange={(value) => {
                    if (value) setTimezone(value)
                  }}
                >
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {formatTimezoneLabel(zone)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </SettingsSection>

          <SettingsSection title="Copy settings from existing team">
            <div className="px-4 py-3.5">
              <p className="text-sm text-muted-foreground">
                Copy workflows, cycle, and team settings from another team. Team
                members and Slack notification settings won&apos;t be copied.
              </p>
            </div>
            <SettingsRow
              label="Copy from team"
              control={
                <Select
                  value={copyFrom}
                  disabled={pending || existingTeams.length === 0}
                  onValueChange={(value) => {
                    if (value) setCopyFrom(value)
                  }}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don&apos;t copy</SelectItem>
                    {existingTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </SettingsSection>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={
                pending ||
                !name.trim() ||
                key.length < 2 ||
                key.length > 4
              }
            >
              {pending ? "Creating…" : "Create team"}
            </Button>
          </div>
        </div>
      </form>
    </SettingsSubpage>
  )
}
