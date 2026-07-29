"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { SettingsPage, SettingsRow } from "@/components/app/settings-page"
import { SlaRulesSortableList } from "@/components/settings/sla-rules-sortable-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createSlaRule,
  deleteSlaRule,
  disableWorkspaceSlas,
  enableWorkspaceSlas,
  reorderSlaRules,
  updateSlaRule,
  updateSlaWorkWeek,
} from "@/lib/sla/actions"
import {
  durationPresetLabel,
  parseSlaRuleInput,
  priorityLabel,
  SLA_CUSTOM_UNITS,
  SLA_DURATION_PRESETS,
  SLA_PRIORITIES,
} from "@/lib/sla/schema"
import type {
  SlaCustomUnit,
  SlaDurationPreset,
  SlaPriority,
  SlaRule,
  SlaRuleAction,
  SlaRuleInput,
  SlaSettings,
  SlaWorkWeek,
} from "@/lib/sla/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "sla-settings"

function emptyRuleDraft(): SlaRuleInput {
  return {
    action: "add",
    durationPreset: "24h",
    customAmount: 1,
    customUnit: "day",
    filters: { priority: ["urgent"] },
  }
}

function ruleToDraft(rule: SlaRule): SlaRuleInput {
  return {
    action: rule.action,
    durationPreset: rule.durationPreset ?? "24h",
    customAmount: rule.customAmount ?? 1,
    customUnit: rule.customUnit ?? "day",
    filters: { priority: [...rule.filters.priority] },
  }
}

export function SlasSettingsForm({
  initialSettings,
}: {
  initialSettings: SlaSettings
}) {
  const router = useRouter()
  const [settings, setSettings] = React.useState(initialSettings)
  const [pending, setPending] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<SlaRule | null>(null)
  const [draft, setDraft] = React.useState<SlaRuleInput>(emptyRuleDraft)

  const pendingRef = React.useRef(false)

  React.useEffect(() => {
    if (pendingRef.current) return
    setSettings(initialSettings)
  }, [initialSettings])

  React.useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  const readOnly = !settings.canEdit
  const slug = settings.workspaceSlug

  async function run(
    work: () => Promise<{ error?: string; settings?: SlaSettings }>,
    successMessage: string
  ) {
    if (readOnly) {
      toast.error(
        "Only owners and admins can manage SLAs while the workspace is editable.",
        { id: TOAST_ID }
      )
      return
    }
    if (pending) return
    setPending(true)
    try {
      const result = await work()
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.settings) setSettings(result.settings)
      toast.success(successMessage, { id: TOAST_ID })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update SLAs.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(false)
    }
  }

  function openCreate() {
    if (!settings.enabled) return
    setEditingRule(null)
    setDraft(emptyRuleDraft())
    setDialogOpen(true)
  }

  function openEdit(rule: SlaRule) {
    setEditingRule(rule)
    setDraft(ruleToDraft(rule))
    setDialogOpen(true)
  }

  function togglePriority(priority: SlaPriority) {
    setDraft((current) => {
      const has = current.filters.priority.includes(priority)
      const next = has
        ? current.filters.priority.filter((item) => item !== priority)
        : [...current.filters.priority, priority]
      return { ...current, filters: { priority: next } }
    })
  }

  async function saveRule() {
    if (readOnly) {
      toast.error(
        "Only owners and admins can manage SLAs while the workspace is editable.",
        { id: TOAST_ID }
      )
      return
    }
    if (pending) return

    const parsed = parseSlaRuleInput(draft)
    if (parsed.error || !parsed.data) {
      toast.error(parsed.error ?? "Invalid SLA rule.", { id: TOAST_ID })
      return
    }

    setPending(true)
    try {
      const result = editingRule
        ? await updateSlaRule(slug, editingRule.id, parsed.data)
        : await createSlaRule(slug, parsed.data)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.settings) setSettings(result.settings)
      toast.success(editingRule ? "SLA rule updated" : "SLA rule created", {
        id: TOAST_ID,
      })
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save SLA rule.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(false)
    }
  }

  async function handleReorder(nextRules: SlaRule[]) {
    if (readOnly || pending) return
    const previous = settings
    const nextSettings: SlaSettings = {
      ...settings,
      rules: nextRules.map((rule, index) => ({ ...rule, position: index })),
    }
    setSettings(nextSettings)
    setPending(true)
    try {
      const result = await reorderSlaRules(
        slug,
        nextRules.map((rule) => rule.id)
      )
      if (result.error) {
        setSettings(previous)
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.settings) setSettings(result.settings)
      toast.success("Rule order updated", { id: TOAST_ID })
      router.refresh()
    } catch (error) {
      setSettings(previous)
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not reorder SLA rules.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <SettingsPage
      title="SLAs"
      description="Service-level agreements (SLAs) automatically apply deadlines to issues when they match predefined parameters. While often used to define response times to customer issues, they can also be used to define internal standards for bug and time-sensitive issue resolution."
      width="narrow"
    >
      {!settings.enabled ? (
        <div
          data-slot="surface"
          className="flex flex-col gap-3 rounded-lg px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">SLAs</p>
            <p className="text-sm text-muted-foreground">
              Enable SLAs to create automation rules that apply or remove
              deadlines on matching issues. Issue evaluation ships after issue
              create/update flows land.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending || readOnly}
            onClick={() =>
              void run(() => enableWorkspaceSlas(slug), "SLAs enabled")
            }
          >
            Enable SLAs
          </Button>
        </div>
      ) : null}

      {settings.enabled ? (
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Work week</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Used for business-day SLA durations and other features that skip
                non-working days.
              </p>
            </div>
            {settings.canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  void run(
                    () => disableWorkspaceSlas(slug),
                    "SLAs disabled"
                  )
                }
              >
                Disable
              </Button>
            ) : null}
          </div>
          <div data-slot="surface" className="overflow-hidden rounded-lg">
            <SettingsRow
              label="Business days"
              description="Days counted for business-day SLA durations."
              control={
                <Select
                  value={settings.workWeek}
                  disabled={pending || readOnly}
                  onValueChange={(value) => {
                    if (!isSlaWorkWeekValue(value)) return
                    void run(
                      () => updateSlaWorkWeek(slug, value),
                      "Work week updated"
                    )
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mon_fri">Monday – Friday</SelectItem>
                    <SelectItem value="sun_thu">Sunday – Thursday</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Automation rules</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use automation rules to automatically add or remove SLAs based on
              filters. First matching rule wins — drag rules to set evaluation
              order.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || readOnly || !settings.enabled}
            onClick={openCreate}
          >
            <PlusIcon className="size-3.5" />
            Add rule
          </Button>
        </div>

        <div data-slot="surface" className="overflow-hidden rounded-lg">
          {!settings.enabled ? (
            <p className="px-4 py-3.5 text-sm text-muted-foreground">
              Enable SLAs to manage automation rules.
            </p>
          ) : (
            <SlaRulesSortableList
              rules={settings.rules}
              canEdit={settings.canEdit}
              pending={pending}
              onReorder={(next) => void handleReorder(next)}
              onEdit={openEdit}
              onDelete={(rule) =>
                void run(
                  () => deleteSlaRule(slug, rule.id),
                  "SLA rule deleted"
                )
              }
            />
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit SLA rule" : "New SLA rule"}
            </DialogTitle>
            <DialogDescription>
              Rules run in list order. Only the first matching rule is applied
              when issues are evaluated later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Action</p>
              <Select
                value={draft.action}
                onValueChange={(value) => {
                  if (value !== "add" && value !== "remove") return
                  setDraft((current) => ({
                    ...current,
                    action: value as SlaRuleAction,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add SLA</SelectItem>
                  <SelectItem value="remove">Remove SLA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.action === "add" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Duration</p>
                <Select
                  value={draft.durationPreset ?? "24h"}
                  onValueChange={(value) => {
                    if (!isDurationPreset(value)) return
                    setDraft((current) => ({
                      ...current,
                      durationPreset: value,
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_DURATION_PRESETS.map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {durationPresetLabel(preset)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.durationPreset === "custom" ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={draft.customAmount ?? 1}
                      data-slot="input"
                      className="h-8 w-20 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customAmount: Number(event.target.value),
                        }))
                      }
                    />
                    <Select
                      value={draft.customUnit ?? "day"}
                      onValueChange={(value) => {
                        if (!isCustomUnit(value)) return
                        setDraft((current) => ({
                          ...current,
                          customUnit: value,
                        }))
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLA_CUSTOM_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit === "business_day"
                              ? "Business days"
                              : unit === "hour"
                                ? "Hours"
                                : unit === "day"
                                  ? "Days"
                                  : "Weeks"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">Priority</p>
              <p className="text-xs text-muted-foreground">
                Match when issue priority is any of the selected values.
              </p>
              <div className="flex flex-wrap gap-2">
                {SLA_PRIORITIES.map((priority) => {
                  const active = draft.filters.priority.includes(priority)
                  return (
                    <button
                      key={priority}
                      type="button"
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => togglePriority(priority)}
                    >
                      {priorityLabel(priority)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || draft.filters.priority.length === 0}
              onClick={() => void saveRule()}
            >
              {editingRule ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  )
}

function isSlaWorkWeekValue(value: string): value is SlaWorkWeek {
  return value === "mon_fri" || value === "sun_thu"
}

function isDurationPreset(value: string): value is SlaDurationPreset {
  return (SLA_DURATION_PRESETS as string[]).includes(value)
}

function isCustomUnit(value: string): value is SlaCustomUnit {
  return (SLA_CUSTOM_UNITS as string[]).includes(value)
}
