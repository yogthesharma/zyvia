"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsSubpage,
} from "@/components/app/settings-page"
import { StatusCategoryIcon } from "@/components/settings/status-category-icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  addTeamWorkflowBranchRule,
  removeTeamWorkflowBranchRule,
  updateTeamWorkflowBranchRule,
  updateTeamWorkflowSettings,
} from "@/lib/workflows/actions"
import {
  AUTO_ARCHIVE_AFTER_PRESETS,
  NO_ACTION_VALUE,
  PR_AUTOMATION_FIELDS,
  STALE_AFTER_PRESETS,
  STATUS_PROGRESS_PLACEMENTS,
  autoArchiveAfterLabel,
  normalizeBranchName,
  staleAfterLabel,
  statusProgressPlacementLabel,
} from "@/lib/workflows/schema"
import type {
  AutoArchiveAfterPreset,
  BranchWorkflowRule,
  StaleAfterPreset,
  StatusProgressPlacement,
  TeamWorkflowSettings,
  TeamWorkflowSettingsUpdate,
  WorkflowStatusOption,
} from "@/lib/workflows/types"

const TOAST_ID = "team-workflows"

function StatusSelectValue({
  status,
}: {
  status: WorkflowStatusOption | null
}) {
  if (!status) {
    return <span className="text-muted-foreground">No action</span>
  }
  return (
    <span className="inline-flex items-center gap-2">
      <StatusCategoryIcon
        kind="issue"
        category={status.category}
        color={status.color}
        className="size-3.5"
      />
      <span className="truncate">{status.name}</span>
    </span>
  )
}

function StatusSelect({
  value,
  statuses,
  disabled,
  onChange,
  allowNone = true,
}: {
  value: string | null
  statuses: WorkflowStatusOption[]
  disabled?: boolean
  onChange: (value: string | null) => void
  allowNone?: boolean
}) {
  const selected = value
    ? (statuses.find((status) => status.id === value) ?? null)
    : null
  const fallback =
    !allowNone && !selected
      ? (statuses.find((status) => status.category === "canceled") ??
        statuses[0] ??
        null)
      : selected
  const selectValue = fallback?.id ?? NO_ACTION_VALUE

  return (
    <Select
      value={selectValue}
      disabled={disabled}
      onValueChange={(next) => {
        onChange(next === NO_ACTION_VALUE ? null : next)
      }}
    >
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="No action">
          <StatusSelectValue status={fallback} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowNone ? (
          <SelectItem value={NO_ACTION_VALUE}>No action</SelectItem>
        ) : null}
        {statuses.map((status) => (
          <SelectItem key={status.id} value={status.id}>
            <span className="inline-flex items-center gap-2">
              <StatusCategoryIcon
                kind="issue"
                category={status.category}
                color={status.color}
                className="size-3.5"
              />
              {status.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TeamWorkflowsSettingsForm({
  initialSettings,
  backHref,
  backLabel,
}: {
  initialSettings: TeamWorkflowSettings
  backHref: string
  backLabel: string
}) {
  const router = useRouter()
  const [settings, setSettings] = React.useState(initialSettings)
  const settingsRef = React.useRef(settings)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )
  const pendingKeysRef = React.useRef(pendingKeys)
  pendingKeysRef.current = pendingKeys
  const requestIds = React.useRef(new Map<string, number>())

  const [branchDialogOpen, setBranchDialogOpen] = React.useState(false)
  const [branchDraft, setBranchDraft] = React.useState("")

  React.useEffect(() => {
    if (pendingKeysRef.current.size > 0) return
    setSettings(initialSettings)
    settingsRef.current = initialSettings
  }, [initialSettings])

  function setSettingsSafe(next: TeamWorkflowSettings) {
    settingsRef.current = next
    setSettings(next)
  }

  function beginPending(key: string) {
    const nextId = (requestIds.current.get(key) ?? 0) + 1
    requestIds.current.set(key, nextId)
    const next = new Set(pendingKeysRef.current).add(key)
    pendingKeysRef.current = next
    setPendingKeys(next)
    return nextId
  }

  function endPending(key: string, requestId: number) {
    if (requestIds.current.get(key) !== requestId) return false
    const next = new Set(pendingKeysRef.current)
    next.delete(key)
    pendingKeysRef.current = next
    setPendingKeys(next)
    return true
  }

  const readOnly = !settings.canEdit
  const pending = pendingKeys.size > 0
  const hasStatuses = settings.statuses.length > 0
  const atBranchLimit = settings.branchRules.length >= 50

  function defaultStaleStatusId() {
    return (
      settingsRef.current.statuses.find(
        (status) => status.category === "canceled"
      )?.id ??
      settingsRef.current.statuses[0]?.id ??
      null
    )
  }

  async function commitField(
    key: string,
    patch: TeamWorkflowSettingsUpdate,
    optimistic: Partial<TeamWorkflowSettings>
  ) {
    if (readOnly) {
      toast.error("Only team managers can manage workflows & automations.", {
        id: TOAST_ID,
      })
      return
    }

    const requestId = beginPending(key)
    const previous = settingsRef.current
    setSettingsSafe({ ...previous, ...optimistic })

    const result = await updateTeamWorkflowSettings({
      slug: previous.workspaceSlug,
      teamId: previous.teamId,
      data: patch,
    })

    if (!endPending(key, requestId)) return
    if (result.error || !result.settings) {
      setSettingsSafe({
        ...settingsRef.current,
        ...Object.fromEntries(
          Object.keys(optimistic).map((field) => [
            field,
            previous[field as keyof TeamWorkflowSettings],
          ])
        ),
      } as TeamWorkflowSettings)
      toast.error(result.error ?? "Could not save settings.", { id: TOAST_ID })
      return
    }
    setSettingsSafe(result.settings)
    router.refresh()
  }

  async function addBranch() {
    const branch = normalizeBranchName(branchDraft)
    if (!branch) return
    if (atBranchLimit) {
      toast.error("You can add up to 50 branch rules.", { id: TOAST_ID })
      return
    }
    const key = "branch-add"
    const requestId = beginPending(key)
    const previous = settingsRef.current
    const result = await addTeamWorkflowBranchRule({
      slug: previous.workspaceSlug,
      teamId: previous.teamId,
      branch,
    })
    if (!endPending(key, requestId)) return
    if (result.error || !result.settings) {
      toast.error(result.error ?? "Could not add branch rule.", {
        id: TOAST_ID,
      })
      return
    }
    setSettingsSafe(result.settings)
    setBranchDialogOpen(false)
    setBranchDraft("")
    toast.success("Branch rule added", { id: TOAST_ID })
    router.refresh()
  }

  return (
    <SettingsSubpage backHref={backHref} backLabel={backLabel}>
      <SettingsPage
        title="Workflows & automations"
        description="Automations that apply to this team's issues and git workflows."
        width="narrow"
      >
        <SettingsSection
          title="Pull request and commit automations"
          description="Choose which status issues should move to when related GitHub activity happens."
        >
          {PR_AUTOMATION_FIELDS.map((field) => (
            <SettingsRow
              key={field.key}
              label={field.label}
              control={
                <StatusSelect
                  value={settings[field.key]}
                  statuses={settings.statuses}
                  disabled={
                    readOnly || !hasStatuses || pendingKeys.has(field.key)
                  }
                  onChange={(value) => {
                    void commitField(
                      field.key,
                      { [field.key]: value } as TeamWorkflowSettingsUpdate,
                      { [field.key]: value } as Partial<TeamWorkflowSettings>
                    )
                  }}
                />
              }
            />
          ))}
        </SettingsSection>

        <SettingsSection
          title="Branch-specific rules"
          description="Override pull request automations for specific target branches."
          framed={false}
        >
          <div className="space-y-3">
            {settings.branchRules.length === 0 ? (
              <div
                data-slot="surface"
                className="rounded-lg px-4 py-3 text-sm text-muted-foreground"
              >
                No branch rules yet.
              </div>
            ) : (
              settings.branchRules.map((rule) => (
                <div
                  key={rule.id}
                  data-slot="surface"
                  className="space-y-1 overflow-hidden rounded-lg"
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <p className="truncate font-mono text-sm">{rule.branch}</p>
                    {readOnly ? null : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        aria-label={`Remove ${rule.branch} rule`}
                        onClick={async () => {
                          const key = `branch-remove:${rule.id}`
                          const requestId = beginPending(key)
                          const previous = settingsRef.current
                          setSettingsSafe({
                            ...previous,
                            branchRules: previous.branchRules.filter(
                              (item) => item.id !== rule.id
                            ),
                          })
                          const result = await removeTeamWorkflowBranchRule({
                            slug: previous.workspaceSlug,
                            teamId: previous.teamId,
                            ruleId: rule.id,
                          })
                          if (!endPending(key, requestId)) return
                          if (result.error || !result.settings) {
                            setSettingsSafe(previous)
                            toast.error(
                              result.error ?? "Could not remove branch rule.",
                              { id: TOAST_ID }
                            )
                            return
                          }
                          setSettingsSafe(result.settings)
                          router.refresh()
                        }}
                      >
                        <TrashIcon className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  {PR_AUTOMATION_FIELDS.map((field) => (
                    <SettingsRow
                      key={`${rule.id}:${field.key}`}
                      label={field.label}
                      control={
                        <StatusSelect
                          value={rule[field.key]}
                          statuses={settings.statuses}
                          disabled={
                            readOnly ||
                            !hasStatuses ||
                            pendingKeys.has(`branch:${rule.id}`)
                          }
                          onChange={async (value) => {
                            const key = `branch:${rule.id}`
                            const requestId = beginPending(key)
                            const previous = settingsRef.current
                            const current =
                              previous.branchRules.find(
                                (item) => item.id === rule.id
                              ) ?? rule
                            const nextRule: BranchWorkflowRule = {
                              ...current,
                              [field.key]: value,
                            }
                            setSettingsSafe({
                              ...previous,
                              branchRules: previous.branchRules.map((item) =>
                                item.id === rule.id ? nextRule : item
                              ),
                            })
                            const result = await updateTeamWorkflowBranchRule({
                              slug: previous.workspaceSlug,
                              teamId: previous.teamId,
                              ruleId: rule.id,
                              patch: { [field.key]: value },
                            })
                            if (!endPending(key, requestId)) return
                            if (result.error || !result.settings) {
                              setSettingsSafe(previous)
                              toast.error(
                                result.error ?? "Could not update branch rule.",
                                { id: TOAST_ID }
                              )
                              return
                            }
                            setSettingsSafe(result.settings)
                            router.refresh()
                          }}
                        />
                      }
                    />
                  ))}
                </div>
              ))
            )}

            {readOnly ? null : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || atBranchLimit}
                onClick={() => {
                  setBranchDraft("")
                  setBranchDialogOpen(true)
                }}
              >
                <PlusIcon className="size-3.5" />
                Add branch
              </Button>
            )}
            {atBranchLimit ? (
              <p className="text-xs text-muted-foreground">
                Branch rule limit reached (50).
              </p>
            ) : null}
          </div>
        </SettingsSection>

        <SettingsSection title="Auto-close automations">
          <SettingsRow
            label="Auto-close parent issues"
            description="Automatically close an open parent issue when its last sub-issue is closed."
            control={
              <Switch
                checked={settings.autoCloseParent}
                disabled={readOnly || pendingKeys.has("autoCloseParent")}
                onCheckedChange={(checked) => {
                  void commitField(
                    "autoCloseParent",
                    { autoCloseParent: checked },
                    { autoCloseParent: checked }
                  )
                }}
                aria-label="Auto-close parent issues"
              />
            }
          />
          <SettingsRow
            label="Auto-close sub-issues"
            description="Automatically close all sub-issues when their parent issue is closed."
            control={
              <Switch
                checked={settings.autoCloseSubIssues}
                disabled={readOnly || pendingKeys.has("autoCloseSubIssues")}
                onCheckedChange={(checked) => {
                  void commitField(
                    "autoCloseSubIssues",
                    { autoCloseSubIssues: checked },
                    { autoCloseSubIssues: checked }
                  )
                }}
                aria-label="Auto-close sub-issues"
              />
            }
          />
          <SettingsRow
            label="Auto-close stale issues"
            description="Automatically close issues that haven't been completed, canceled, or updated in the selected period."
            control={
              <Switch
                checked={settings.autoCloseStale}
                disabled={readOnly || pendingKeys.has("autoCloseStale")}
                onCheckedChange={(checked) => {
                  const patch: TeamWorkflowSettingsUpdate = {
                    autoCloseStale: checked,
                  }
                  const optimistic: Partial<TeamWorkflowSettings> = {
                    autoCloseStale: checked,
                  }
                  if (checked && !settingsRef.current.staleStatusId) {
                    const staleStatusId = defaultStaleStatusId()
                    if (!staleStatusId) {
                      toast.error(
                        "Add a Canceled status before enabling stale auto-close.",
                        { id: TOAST_ID }
                      )
                      return
                    }
                    patch.staleStatusId = staleStatusId
                    optimistic.staleStatusId = staleStatusId
                  }
                  void commitField("autoCloseStale", patch, optimistic)
                }}
                aria-label="Auto-close stale issues"
              />
            }
          />
          {settings.autoCloseStale ? (
            <>
              <SettingsRow
                label="Close after being stale for"
                control={
                  <Select
                    value={settings.staleAfterPreset}
                    disabled={
                      readOnly || pendingKeys.has("staleAfterPreset")
                    }
                    onValueChange={(value) => {
                      const preset = value as StaleAfterPreset
                      void commitField(
                        "staleAfterPreset",
                        { staleAfterPreset: preset },
                        { staleAfterPreset: preset }
                      )
                    }}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STALE_AFTER_PRESETS.map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {staleAfterLabel(preset)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <SettingsRow
                label="When closing stale issues, set status to"
                control={
                  <StatusSelect
                    value={settings.staleStatusId}
                    statuses={settings.statuses}
                    allowNone={false}
                    disabled={
                      readOnly || !hasStatuses || pendingKeys.has("staleStatusId")
                    }
                    onChange={(value) => {
                      if (!value) return
                      void commitField(
                        "staleStatusId",
                        { staleStatusId: value },
                        { staleStatusId: value }
                      )
                    }}
                  />
                }
              />
            </>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="Auto-archive closed issues, cycles, and projects"
          description="Closed (completed, canceled, or duplicate) issues and completed cycles are automatically archived after the set time period. Issues in a project also wait until the project has been completed or canceled for that period, and the project itself is archived once all of its issues have been. Changes apply within a day."
        >
          <SettingsRow
            label="Auto-archive closed items after"
            control={
              <Select
                value={settings.autoArchiveAfterPreset}
                disabled={
                  readOnly || pendingKeys.has("autoArchiveAfterPreset")
                }
                onValueChange={(value) => {
                  const preset = value as AutoArchiveAfterPreset
                  void commitField(
                    "autoArchiveAfterPreset",
                    { autoArchiveAfterPreset: preset },
                    { autoArchiveAfterPreset: preset }
                  )
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTO_ARCHIVE_AFTER_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {autoArchiveAfterLabel(preset)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Re-order issues when moved to a new status"
          description="Define how issues should be ordered as they progress. Unless no action is chosen, issues moving to a previous status are always placed at the top of that status. This affects manual ordering."
        >
          <SettingsRow
            label="When progressing status, place issues…"
            control={
              <Select
                value={settings.statusProgressPlacement}
                disabled={
                  readOnly || pendingKeys.has("statusProgressPlacement")
                }
                onValueChange={(value) => {
                  const placement = value as StatusProgressPlacement
                  void commitField(
                    "statusProgressPlacement",
                    { statusProgressPlacement: placement },
                    { statusProgressPlacement: placement }
                  )
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_PROGRESS_PLACEMENTS.map((placement) => (
                    <SelectItem key={placement} value={placement}>
                      {statusProgressPlacementLabel(placement)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </SettingsSection>

        {readOnly ? (
          <SettingsSection framed={false}>
            <p className="text-sm text-muted-foreground">
              {settings.deletionLocked
                ? "Settings are locked while workspace deletion is scheduled."
                : "Only team managers can edit workflows & automations."}
            </p>
          </SettingsSection>
        ) : null}

        <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add branch rule</DialogTitle>
              <DialogDescription>
                Automations for pull requests targeting this branch will use the
                overrides you configure.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={branchDraft}
              placeholder="main"
              maxLength={120}
              autoFocus
              onChange={(event) => setBranchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void addBranch()
                }
              }}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBranchDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  pending || atBranchLimit || !normalizeBranchName(branchDraft)
                }
                onClick={() => void addBranch()}
              >
                Add branch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsPage>
    </SettingsSubpage>
  )
}
