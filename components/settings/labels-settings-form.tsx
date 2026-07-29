"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  SettingsPage,
  SettingsSubpage,
} from "@/components/app/settings-page"
import { LabelColorPicker } from "@/components/settings/label-color-picker"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  archiveLabel,
  createLabel,
  deleteLabel,
  unarchiveLabel,
  updateLabel,
} from "@/lib/labels/actions"
import {
  MAX_LABEL_DESCRIPTION_LENGTH,
  MAX_LABEL_NAME_LENGTH,
  randomLabelColor,
} from "@/lib/labels/schema"
import type {
  LabelKind,
  LabelRecord,
  LabelScopeFilter,
  LabelsSettings,
} from "@/lib/labels/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "labels-settings"

function formatCreated(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function formatLastApplied(iso: string | null) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`
  return formatCreated(iso)
}

function matchesQuery(label: LabelRecord, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    label.name.toLowerCase().includes(q) ||
    label.description.toLowerCase().includes(q) ||
    (label.teamKey?.toLowerCase().includes(q) ?? false) ||
    (label.teamName?.toLowerCase().includes(q) ?? false)
  )
}

function filterLabels(
  labels: LabelRecord[],
  scope: LabelScopeFilter,
  pageTeamId: string | null,
  query: string
) {
  const inScope = labels.filter((label) => {
    if (pageTeamId) {
      if (scope === "archived") return Boolean(label.archivedAt)
      return !label.archivedAt
    }

    if (scope === "archived") {
      return Boolean(label.archivedAt)
    }
    if (label.archivedAt) return false
    if (scope === "workspace") return label.teamId == null
    return true
  })

  if (!query.trim()) return inScope

  const matched = new Set(
    inScope.filter((label) => matchesQuery(label, query)).map((label) => label.id)
  )
  for (const label of inScope) {
    if (!matched.has(label.id) || !label.parentId) continue
    let parentId: string | null = label.parentId
    while (parentId) {
      if (matched.has(parentId)) break
      matched.add(parentId)
      const parent = inScope.find((item) => item.id === parentId)
      parentId = parent?.parentId ?? null
    }
  }

  return inScope.filter((label) => matched.has(label.id))
}

type TreeRow =
  | { type: "group"; label: LabelRecord; children: LabelRecord[] }
  | { type: "label"; label: LabelRecord }

function buildTree(labels: LabelRecord[]): TreeRow[] {
  const ids = new Set(labels.map((label) => label.id))
  // Promote orphans (e.g. archived child whose parent is still active) to roots
  // so they remain visible in the current filter.
  const roots = labels
    .filter(
      (label) => label.parentId == null || !ids.has(label.parentId)
    )
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

  const rows: TreeRow[] = []
  for (const root of roots) {
    if (root.isGroup) {
      const children = labels
        .filter((label) => label.parentId === root.id)
        .sort(
          (a, b) => a.position - b.position || a.name.localeCompare(b.name)
        )
      rows.push({ type: "group", label: root, children })
    } else {
      rows.push({ type: "label", label: root })
    }
  }
  return rows
}

function usageHeader(kind: LabelKind) {
  return kind === "project" ? "Projects" : "Issues"
}

export function LabelsSettingsForm({
  initialSettings,
  backHref,
  backLabel,
}: {
  initialSettings: LabelsSettings
  backHref?: string
  backLabel?: string
}) {
  const router = useRouter()
  const [settings, setSettings] = React.useState(initialSettings)
  const [pending, setPending] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [scope, setScope] = React.useState<LabelScopeFilter>("workspace")
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = React.useState<LabelRecord | null>(
    null
  )
  const pendingRef = React.useRef(false)

  React.useEffect(() => {
    if (pendingRef.current) return
    setSettings(initialSettings)
  }, [initialSettings])

  React.useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  React.useEffect(() => {
    if (settings.teamId) setScope("workspace")
  }, [settings.teamId])

  const readOnly = !settings.canEdit
  const slug = settings.workspaceSlug
  const pageTeamId = settings.teamId
  const kind = settings.kind

  const filtered = React.useMemo(
    () => filterLabels(settings.labels, scope, pageTeamId, query),
    [settings.labels, scope, pageTeamId, query]
  )
  const tree = React.useMemo(() => buildTree(filtered), [filtered])

  const title = kind === "project" ? "Project labels" : "Issue labels"

  const description =
    kind === "project"
      ? "Organize projects with custom labels relevant to your organization's context."
      : pageTeamId
        ? `Manage issue labels for ${settings.teamName ?? "this team"}.`
        : "Labels allow you to organize issues. Create labels at the workspace level or for a specific team."

  async function run(
    work: () => Promise<{ error?: string; settings?: LabelsSettings }>,
    successMessage: string
  ) {
    if (readOnly) {
      toast.error(
        pageTeamId
          ? "Only team managers can manage these labels."
          : "Only workspace owners and admins can manage labels.",
        { id: TOAST_ID }
      )
      return false
    }
    if (pending) return false
    setPending(true)
    try {
      const result = await work()
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return false
      }
      if (result.settings) setSettings(result.settings)
      toast.success(successMessage, { id: TOAST_ID })
      router.refresh()
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
        { id: TOAST_ID }
      )
      return false
    } finally {
      setPending(false)
    }
  }

  async function handleCreate(isGroup: boolean, parentId?: string | null) {
    await run(
      () =>
        createLabel(
          slug,
          kind,
          {
            isGroup,
            name: isGroup ? "New group" : "New label",
            color: randomLabelColor(),
            parentId: parentId ?? null,
          },
          pageTeamId
        ),
      isGroup ? "Group created" : "Label created"
    )
  }

  async function handleUpdate(
    label: LabelRecord,
    patch: { name?: string; description?: string; color?: string }
  ): Promise<boolean> {
    if (readOnly) return false
    if (pending) {
      toast.error("Please wait for the current save to finish.", {
        id: TOAST_ID,
      })
      return false
    }

    const nextName = patch.name !== undefined ? patch.name : label.name
    const nextDescription =
      patch.description !== undefined ? patch.description : label.description
    const nextColor = patch.color !== undefined ? patch.color : label.color

    if (
      nextName === label.name &&
      nextDescription === label.description &&
      nextColor === label.color
    ) {
      return true
    }

    const previous = settings
    setSettings((current) => ({
      ...current,
      labels: current.labels.map((item) =>
        item.id === label.id
          ? {
              ...item,
              name: nextName,
              description: nextDescription,
              color: nextColor,
            }
          : item
      ),
    }))

    setPending(true)
    try {
      const result = await updateLabel(
        slug,
        kind,
        label.id,
        {
          name: nextName,
          description: nextDescription,
          color: nextColor,
        },
        pageTeamId
      )
      if (result.error) {
        setSettings(previous)
        toast.error(result.error, { id: TOAST_ID })
        return false
      }
      if (result.settings) setSettings(result.settings)
      toast.success(label.isGroup ? "Group updated" : "Label updated", {
        id: TOAST_ID,
      })
      router.refresh()
      return true
    } catch (error) {
      setSettings(previous)
      toast.error(
        error instanceof Error ? error.message : "Could not update label.",
        { id: TOAST_ID }
      )
      return false
    } finally {
      setPending(false)
    }
  }

  const body = (
    <SettingsPage title={title} description={description} width="full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name..."
              className="h-8 pl-8"
            />
          </div>
          {!pageTeamId ? (
            <Select
              value={scope}
              onValueChange={(value) => {
                if (
                  value === "workspace" ||
                  value === "workspace_and_teams" ||
                  value === "archived"
                ) {
                  setScope(value)
                }
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">Workspace</SelectItem>
                {kind === "issue" ? (
                  <SelectItem value="workspace_and_teams">
                    Workspace and teams
                  </SelectItem>
                ) : null}
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={scope === "archived" ? "archived" : "active"}
              onValueChange={(value) =>
                setScope(value === "archived" ? "archived" : "workspace")
              }
            >
              <SelectTrigger className="h-8 w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || readOnly || scope === "archived"}
            onClick={() => void handleCreate(true)}
          >
            New group
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || readOnly || scope === "archived"}
            onClick={() => void handleCreate(false)}
          >
            New label
          </Button>
        </div>
      </div>

      <div data-slot="surface" className="overflow-x-auto rounded-lg">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-[minmax(12rem,1.4fr)_minmax(10rem,1.2fr)_4.5rem_7rem_5.5rem_2rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
            <span>Name</span>
            <span>Description</span>
            <span className="text-right">{usageHeader(kind)}</span>
            <span className="text-right">Last applied</span>
            <span className="text-right">Created</span>
            <span />
          </div>

          {tree.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query
                ? "No labels match your filter."
                : scope === "archived"
                  ? "No archived labels."
                  : "No labels yet. Create a label or group to get started."}
            </p>
          ) : (
            tree.map((row) => {
              if (row.type === "label") {
                return (
                  <LabelRow
                    key={row.label.id}
                    label={row.label}
                    depth={0}
                    canEdit={!readOnly}
                    pending={pending}
                    onUpdate={(patch) => handleUpdate(row.label, patch)}
                    onArchive={() =>
                      void run(
                        () =>
                          archiveLabel(slug, kind, row.label.id, pageTeamId),
                        "Label archived"
                      )
                    }
                    onUnarchive={() =>
                      void run(
                        () =>
                          unarchiveLabel(slug, kind, row.label.id, pageTeamId),
                        "Label restored"
                      )
                    }
                    onDelete={() => setDeleteTarget(row.label)}
                  />
                )
              }

              const isCollapsed = collapsed.has(row.label.id)
              return (
                <div key={row.label.id}>
                  <LabelRow
                    label={row.label}
                    depth={0}
                    canEdit={!readOnly}
                    pending={pending}
                    expanded={!isCollapsed}
                    onToggle={() =>
                      setCollapsed((current) => {
                        const next = new Set(current)
                        if (next.has(row.label.id)) next.delete(row.label.id)
                        else next.add(row.label.id)
                        return next
                      })
                    }
                    onUpdate={(patch) => handleUpdate(row.label, patch)}
                    onArchive={() =>
                      void run(
                        () =>
                          archiveLabel(slug, kind, row.label.id, pageTeamId),
                        "Group archived"
                      )
                    }
                    onUnarchive={() =>
                      void run(
                        () =>
                          unarchiveLabel(
                            slug,
                            kind,
                            row.label.id,
                            pageTeamId
                          ),
                        "Group restored"
                      )
                    }
                    onDelete={() => setDeleteTarget(row.label)}
                    onAddChild={
                      scope === "archived" ||
                      row.label.teamId !== pageTeamId ||
                      Boolean(row.label.archivedAt)
                        ? undefined
                        : () => void handleCreate(false, row.label.id)
                    }
                  />
                  {!isCollapsed
                    ? row.children.map((child) => (
                        <LabelRow
                          key={child.id}
                          label={child}
                          depth={1}
                          canEdit={!readOnly}
                          pending={pending}
                          onUpdate={(patch) => handleUpdate(child, patch)}
                          onArchive={() =>
                            void run(
                              () =>
                                archiveLabel(
                                  slug,
                                  kind,
                                  child.id,
                                  pageTeamId
                                ),
                              "Label archived"
                            )
                          }
                          onUnarchive={() =>
                            void run(
                              () =>
                                unarchiveLabel(
                                  slug,
                                  kind,
                                  child.id,
                                  pageTeamId
                                ),
                              "Label restored"
                            )
                          }
                          onDelete={() => setDeleteTarget(child)}
                        />
                      ))
                    : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.isGroup ? "group" : "label"}
            </DialogTitle>
            <DialogDescription>
              Deleting <strong>{deleteTarget?.name}</strong> cannot be undone
              {deleteTarget?.isGroup
                ? " and removes every label in the group"
                : ""}
              {kind === "issue"
                ? ", including from issues where it is applied"
                : ""}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !deleteTarget}
              onClick={async () => {
                if (!deleteTarget) return
                const ok = await run(
                  () =>
                    deleteLabel(slug, kind, deleteTarget.id, pageTeamId),
                  deleteTarget.isGroup ? "Group deleted" : "Label deleted"
                )
                if (ok) setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  )

  if (backHref && backLabel) {
    return (
      <SettingsSubpage backHref={backHref} backLabel={backLabel}>
        {body}
      </SettingsSubpage>
    )
  }

  return body
}

function LabelRow({
  label,
  depth,
  canEdit,
  pending,
  expanded,
  onToggle,
  onUpdate,
  onArchive,
  onUnarchive,
  onDelete,
  onAddChild,
}: {
  label: LabelRecord
  depth: number
  canEdit: boolean
  pending: boolean
  expanded?: boolean
  onToggle?: () => void
  onUpdate: (patch: {
    name?: string
    description?: string
    color?: string
  }) => boolean | Promise<boolean>
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  onAddChild?: () => void
}) {
  const [name, setName] = React.useState(label.name)
  const [description, setDescription] = React.useState(label.description)
  const [nameFocused, setNameFocused] = React.useState(false)
  const [descriptionFocused, setDescriptionFocused] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    setName(label.name)
    setDescription(label.description)
  }, [label.name, label.description])

  const restedActive = nameFocused || descriptionFocused || menuOpen

  return (
    <div
      data-rested={restedActive ? "true" : undefined}
      className={cn(
        "group/row grid grid-cols-[minmax(12rem,1.4fr)_minmax(10rem,1.2fr)_4.5rem_7rem_5.5rem_2rem] items-center gap-2 border-b border-border/40 px-3 py-1.5 last:border-b-0 hover:bg-muted/40 data-[rested=true]:bg-muted/40",
        label.archivedAt && "opacity-70"
      )}
    >
      <div
        className="flex min-w-0 items-center gap-0"
        style={{ paddingLeft: depth * 24 }}
      >
        {label.isGroup ? (
          <button
            type="button"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            onClick={onToggle}
            aria-label={expanded ? "Collapse group" : "Expand group"}
          >
            {expanded ? (
              <CaretDownIcon className="size-3.5" />
            ) : (
              <CaretRightIcon className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}

        {label.isGroup ? (
          <span className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
            <SquaresFourIcon className="size-3.5" />
          </span>
        ) : (
          <LabelColorPicker
            value={label.color}
            disabled={!canEdit || pending}
            onChange={(color) => {
              void onUpdate({ color })
            }}
          />
        )}

        <Input
          value={name}
          disabled={!canEdit || pending}
          maxLength={MAX_LABEL_NAME_LENGTH}
          className={cn(
            "h-7 min-w-0 max-w-[14rem] !w-auto !flex-none !rounded-md !border-transparent !bg-transparent !px-1 !shadow-none",
            "hover:!border-transparent hover:!bg-transparent",
            "focus-visible:!border-input focus-visible:!bg-background focus-visible:!ring-0"
          )}
          onFocus={() => setNameFocused(true)}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            setNameFocused(false)
            const next = name.trim().replace(/\s+/g, " ")
            if (!next) {
              setName(label.name)
              return
            }
            if (next === label.name) return
            void (async () => {
              const ok = await onUpdate({ name: next })
              if (!ok) setName(label.name)
            })()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setName(label.name)
              event.currentTarget.blur()
            }
          }}
        />

        {label.teamKey ? (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {label.teamKey}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        {label.isGroup ? (
          <span className="px-1 text-sm text-muted-foreground/50">—</span>
        ) : (
          <Input
            value={description}
            disabled={!canEdit || pending}
            maxLength={MAX_LABEL_DESCRIPTION_LENGTH}
            placeholder="Add label description..."
            className={cn(
              "h-7 max-w-[16rem] !w-auto !flex-none !rounded-md !border-transparent !bg-transparent !px-1 !shadow-none text-muted-foreground",
              "hover:!border-transparent hover:!bg-transparent",
              "placeholder:text-transparent",
              "group-hover/row:placeholder:text-muted-foreground/50",
              "group-data-[rested=true]/row:placeholder:text-muted-foreground/50",
              "focus-visible:!border-input focus-visible:!bg-background focus-visible:!ring-0 focus-visible:text-foreground",
              "focus-visible:placeholder:text-muted-foreground/50"
            )}
            onFocus={() => setDescriptionFocused(true)}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => {
              setDescriptionFocused(false)
              const next = description.trim().replace(/\s+/g, " ")
              if (next === label.description) return
              void (async () => {
                const ok = await onUpdate({ description: next })
                if (!ok) setDescription(label.description)
              })()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur()
              if (event.key === "Escape") {
                setDescription(label.description)
                event.currentTarget.blur()
              }
            }}
          />
        )}
      </div>

      <span className="text-right text-sm tabular-nums text-muted-foreground">
        {label.isGroup ? "—" : label.usageCount || "—"}
      </span>
      <span className="text-right text-sm text-muted-foreground">
        {label.isGroup ? "—" : formatLastApplied(label.lastAppliedAt)}
      </span>
      <span className="text-right text-sm text-muted-foreground">
        {formatCreated(label.createdAt)}
      </span>

      <div className="flex justify-end">
        {canEdit ? (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "opacity-0 transition-opacity",
                  "group-hover/row:opacity-100 group-data-[rested=true]/row:opacity-100",
                  "data-[state=open]:opacity-100 focus-visible:opacity-100"
                )}
                disabled={pending}
              >
                <DotsThreeIcon className="size-4" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onAddChild ? (
                <DropdownMenuItem onClick={onAddChild}>
                  Add label to group
                </DropdownMenuItem>
              ) : null}
              {label.archivedAt ? (
                <DropdownMenuItem onClick={onUnarchive}>
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}
