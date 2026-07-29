"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { TeamIcon } from "@/components/app/team-icon"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { updateTeamGeneralSettings } from "@/lib/teams/actions"
import {
  DEFAULT_TEAM_ICON,
  estimationScaleLabel,
  MAX_TEAM_DESCRIPTION_LENGTH,
  parseTeamDescription,
  parseTeamKey,
  parseTeamName,
} from "@/lib/teams/schema"
import {
  formatTimezoneLabel,
  timezoneOptions,
} from "@/lib/teams/timezones"
import type {
  TeamEstimationScale,
  TeamGeneralSettingsUpdate,
  TeamSettings,
} from "@/lib/teams/types"

const TOAST_ID = "team-general-settings"

const ESTIMATION_OPTIONS: TeamEstimationScale[] = [
  "none",
  "exponential",
  "fibonacci",
  "linear",
  "tshirt",
]

type FieldKey = keyof TeamGeneralSettingsUpdate

export function TeamGeneralForm({
  workspaceSlug,
  initialTeam,
}: {
  workspaceSlug: string
  initialTeam: TeamSettings
}) {
  const router = useRouter()
  const [team, setTeam] = React.useState(initialTeam)
  const [name, setName] = React.useState(initialTeam.name)
  const [key, setKey] = React.useState(initialTeam.key)
  const [description, setDescription] = React.useState(initialTeam.description)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )

  const teamRef = React.useRef(team)
  const pendingKeysRef = React.useRef(pendingKeys)
  const requestIdsRef = React.useRef<Record<string, number>>({})

  const hubHref = `/w/${workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
  const zones = React.useMemo(
    () => timezoneOptions(team.timezone),
    [team.timezone]
  )
  const readOnly = !team.canManage
  const iconValue = (team.icon || DEFAULT_TEAM_ICON) as IconName

  React.useEffect(() => {
    if (pendingKeysRef.current.size > 0) return
    setTeam(initialTeam)
    setName(initialTeam.name)
    setKey(initialTeam.key)
    setDescription(initialTeam.description)
    teamRef.current = initialTeam
  }, [initialTeam])

  React.useEffect(() => {
    teamRef.current = team
  }, [team])

  React.useEffect(() => {
    pendingKeysRef.current = pendingKeys
  }, [pendingKeys])

  function setKeyPending(field: string, pending: boolean) {
    setPendingKeys((prev) => {
      const next = new Set(prev)
      if (pending) next.add(field)
      else next.delete(field)
      pendingKeysRef.current = next
      return next
    })
  }

  const isPending = (field: string) => pendingKeys.has(field)

  function applyServerTeam(server: TeamSettings) {
    const pending = pendingKeysRef.current
    const merged: TeamSettings = { ...server }
    if (pending.has("name")) merged.name = teamRef.current.name
    if (pending.has("key")) merged.key = teamRef.current.key
    if (pending.has("description")) {
      merged.description = teamRef.current.description
    }
    if (pending.has("icon")) merged.icon = teamRef.current.icon
    if (pending.has("timezone")) merged.timezone = teamRef.current.timezone
    if (pending.has("estimationScale")) {
      merged.estimationScale = teamRef.current.estimationScale
    }
    if (pending.has("emailIntakeEnabled")) {
      merged.emailIntakeEnabled = teamRef.current.emailIntakeEnabled
    }
    if (pending.has("detailedIssueHistory")) {
      merged.detailedIssueHistory = teamRef.current.detailedIssueHistory
    }

    teamRef.current = merged
    setTeam(merged)
    if (!pending.has("name")) setName(merged.name)
    if (!pending.has("key")) setKey(merged.key)
    if (!pending.has("description")) setDescription(merged.description)
  }

  function rollbackField(field: FieldKey, previous: TeamSettings) {
    const next = { ...teamRef.current }
    if (field === "name") {
      next.name = previous.name
      setName(previous.name)
    } else if (field === "key") {
      next.key = previous.key
      setKey(previous.key)
    } else if (field === "description") {
      next.description = previous.description
      setDescription(previous.description)
    } else if (field === "icon") {
      next.icon = previous.icon
    } else if (field === "timezone") {
      next.timezone = previous.timezone
    } else if (field === "estimationScale") {
      next.estimationScale = previous.estimationScale
    } else if (field === "emailIntakeEnabled") {
      next.emailIntakeEnabled = previous.emailIntakeEnabled
    } else if (field === "detailedIssueHistory") {
      next.detailedIssueHistory = previous.detailedIssueHistory
    }
    teamRef.current = next
    setTeam(next)
  }

  async function commitField(field: FieldKey, raw: unknown) {
    if (readOnly) {
      toast.error("Only team owners or admins can edit team settings.", {
        id: TOAST_ID,
      })
      return
    }

    const patch: TeamGeneralSettingsUpdate = {}
    const previous = teamRef.current

    if (field === "name") {
      const parsed = parseTeamName(raw)
      if (parsed.error || !parsed.name) {
        setName(previous.name)
        toast.error(parsed.error ?? "Enter a team name.", { id: TOAST_ID })
        return
      }
      if (parsed.name === previous.name) {
        setName(previous.name)
        return
      }
      patch.name = parsed.name
      setName(parsed.name)
    } else if (field === "key") {
      const parsed = parseTeamKey(raw)
      if (parsed.error || !parsed.key) {
        setKey(previous.key)
        toast.error(parsed.error ?? "Enter a team identifier.", {
          id: TOAST_ID,
        })
        return
      }
      if (parsed.key === previous.key) {
        setKey(previous.key)
        return
      }
      patch.key = parsed.key
      setKey(parsed.key)
    } else if (field === "description") {
      const parsed = parseTeamDescription(raw)
      if (parsed.error || parsed.description === undefined) {
        setDescription(previous.description)
        toast.error(parsed.error ?? "Enter a valid description.", {
          id: TOAST_ID,
        })
        return
      }
      if (parsed.description === previous.description) {
        setDescription(previous.description)
        return
      }
      patch.description = parsed.description
      setDescription(parsed.description)
    } else if (field === "icon") {
      if (typeof raw !== "string") return
      if (raw === (previous.icon || DEFAULT_TEAM_ICON)) return
      patch.icon = raw
    } else if (field === "timezone") {
      if (typeof raw !== "string" || raw === previous.timezone) return
      patch.timezone = raw
    } else if (field === "estimationScale") {
      if (typeof raw !== "string" || raw === previous.estimationScale) return
      patch.estimationScale = raw as TeamEstimationScale
    } else if (field === "emailIntakeEnabled") {
      if (typeof raw !== "boolean" || raw === previous.emailIntakeEnabled) {
        return
      }
      patch.emailIntakeEnabled = raw
    } else if (field === "detailedIssueHistory") {
      if (
        typeof raw !== "boolean" ||
        raw === previous.detailedIssueHistory
      ) {
        return
      }
      patch.detailedIssueHistory = raw
    } else {
      return
    }

    const requestId = (requestIdsRef.current[field] ?? 0) + 1
    requestIdsRef.current[field] = requestId
    setKeyPending(field, true)

    const optimistic = { ...teamRef.current, ...patch }
    if (patch.icon !== undefined) {
      optimistic.icon = patch.icon || DEFAULT_TEAM_ICON
    }
    teamRef.current = optimistic
    setTeam(optimistic)

    try {
      const result = await updateTeamGeneralSettings({
        workspaceId: previous.workspaceId,
        workspaceSlug,
        teamId: previous.id,
        patch,
      })

      if (requestIdsRef.current[field] !== requestId) return

      if (result.error || !result.team) {
        rollbackField(field, previous)
        toast.error(result.error ?? "Could not save team settings.", {
          id: TOAST_ID,
        })
        return
      }

      applyServerTeam(result.team)
      toast.success("Saved", { id: TOAST_ID })

      if (result.redirectTo) {
        router.replace(result.redirectTo)
        return
      }
      router.refresh()
    } catch (error) {
      if (requestIdsRef.current[field] !== requestId) return
      rollbackField(field, previous)
      toast.error(
        error instanceof Error ? error.message : "Could not save team settings.",
        { id: TOAST_ID }
      )
    } finally {
      if (requestIdsRef.current[field] === requestId) {
        setKeyPending(field, false)
      }
    }
  }

  return (
    <SettingsSubpage backHref={hubHref} backLabel="Back">
      <div className="mx-auto w-full max-w-3xl px-8 pt-12 pb-8">
        <header className="mb-8 flex items-center gap-2.5">
          <TeamIcon icon={team.icon} className="size-5" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{team.name}</p>
            <h1 className="text-xl font-semibold tracking-tight">General</h1>
          </div>
        </header>

        <div className="space-y-10">
          <SettingsSection>
            <SettingsRow
              label="Icon & name"
              control={
                <div className="flex h-8 w-full max-w-sm items-stretch gap-2">
                  <IconPicker
                    value={iconValue}
                    onValueChange={(next) => {
                      void commitField("icon", next)
                    }}
                    searchable
                    categorized
                    modal
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      disabled={readOnly || isPending("icon")}
                      aria-label="Choose team icon"
                    >
                      <Icon name={iconValue} className="size-4" />
                    </Button>
                  </IconPicker>
                  <Input
                    value={name}
                    maxLength={80}
                    disabled={readOnly || isPending("name")}
                    className="h-8 flex-1"
                    aria-label="Team name"
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => void commitField("name", name)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur()
                      }
                    }}
                  />
                </div>
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Identifier"
            description="Used in issue IDs"
          >
            <SettingsRow
              label="Identifier"
              control={
                <Input
                  value={key}
                  maxLength={4}
                  disabled={readOnly || isPending("key")}
                  className="h-8 w-28 uppercase"
                  aria-label="Team identifier"
                  onChange={(event) =>
                    setKey(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 4)
                    )
                  }
                  onBlur={() => void commitField("key", key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur()
                    }
                  }}
                />
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Description"
            description="A short summary shown on the team page"
          >
            <div className="px-4 py-3.5">
              <Textarea
                value={description}
                maxLength={MAX_TEAM_DESCRIPTION_LENGTH}
                disabled={readOnly || isPending("description")}
                placeholder="e.g. Builds and maintains core platform infrastructure"
                className="min-h-24 resize-y"
                aria-label="Team description"
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => void commitField("description", description)}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Timezone"
            description="Used for team schedules, dates, and cycle start times"
          >
            <SettingsRow
              label="Timezone"
              control={
                <Select
                  value={team.timezone}
                  disabled={readOnly || isPending("timezone")}
                  onValueChange={(value) => {
                    if (value) void commitField("timezone", value)
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

          <SettingsSection
            title="Estimates"
            description="Used to estimate issue complexity and plan cycle capacity"
          >
            <SettingsRow
              label="Issue estimation"
              control={
                <Select
                  value={team.estimationScale}
                  disabled={readOnly || isPending("estimationScale")}
                  onValueChange={(value) => {
                    if (value) void commitField("estimationScale", value)
                  }}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTIMATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {estimationScaleLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Create issues by email"
            description="Use a team-specific email address to create and collaborate on issues via email"
          >
            <SettingsRow
              label="Enable issue creation by email"
              control={
                <Switch
                  checked={team.emailIntakeEnabled}
                  disabled={readOnly || isPending("emailIntakeEnabled")}
                  onCheckedChange={(checked) =>
                    void commitField("emailIntakeEnabled", checked)
                  }
                  aria-label="Enable issue creation by email"
                />
              }
            />
          </SettingsSection>

          <SettingsSection title="Other">
            <SettingsRow
              label="Enable detailed issue history"
              description="Each change to an issue receives and persists a distinct history entry, creating a more detailed history for auditing purposes."
              control={
                <Switch
                  checked={team.detailedIssueHistory}
                  disabled={readOnly || isPending("detailedIssueHistory")}
                  onCheckedChange={(checked) =>
                    void commitField("detailedIssueHistory", checked)
                  }
                  aria-label="Enable detailed issue history"
                />
              }
            />
          </SettingsSection>
        </div>
      </div>
    </SettingsSubpage>
  )
}
