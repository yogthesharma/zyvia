"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  DotsSixVerticalIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  SettingsPage,
  SettingsSection,
  SettingsSubpage,
} from "@/components/app/settings-page"
import { StatusCategoryIcon } from "@/components/settings/status-category-icon"
import { StatusColorPicker } from "@/components/settings/status-color-picker"
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
  addStatusInCategory,
  deleteStatus,
  reorderStatuses,
  updateStatus,
} from "@/lib/statuses/actions"
import {
  MAX_STATUS_DESCRIPTION_LENGTH,
  MAX_STATUS_NAME_LENGTH,
  categoriesForKind,
  categoryLabel,
  normalizeStatusDescription,
  normalizeStatusName,
  statusDraftUnchanged,
} from "@/lib/statuses/schema"
import type {
  StatusCategory,
  StatusRecord,
  StatusesSettings,
} from "@/lib/statuses/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "statuses-settings"

function usageLabel(status: StatusRecord, kind: StatusesSettings["kind"]) {
  if (status.description) return status.description
  if (kind !== "issue" || status.usageCount <= 0) return null
  return `${status.usageCount} issue${status.usageCount === 1 ? "" : "s"}`
}

function StatusRowBody({
  status,
  subtitle,
  leading,
  trailing,
  className,
}: {
  status: StatusRecord
  subtitle?: string | null
  leading?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2.5", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {status.name}
          {status.isDefault ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · Default
            </span>
          ) : null}
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  )
}

function SortableStatusRow({
  status,
  kind,
  disabled,
  canDrag,
  canDelete,
  onEdit,
  onDelete,
  onColorChange,
  onSetDefault,
}: {
  status: StatusRecord
  kind: StatusesSettings["kind"]
  disabled: boolean
  canDrag: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  onColorChange: (color: string) => void
  onSetDefault: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id, disabled: disabled || !canDrag })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ??
      "transform 200ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 150ms ease",
    zIndex: isDragging ? 20 : undefined,
  }

  const subtitle = usageLabel(status, kind)

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative last:border-b-0",
        "transition-[background-color,opacity,box-shadow] duration-150",
        !isDragging && "hover:bg-muted/40",
        isDragging && "z-20 opacity-40 shadow-none"
      )}
    >
      {isDragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 inset-y-2 rounded-md bg-muted/50"
        />
      ) : null}
      <div className={cn("flex items-center gap-1 px-1", isDragging && "invisible")}>
        {canDrag ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className={cn(
              "inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground",
              "hover:bg-muted hover:text-foreground active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "pointer-events-none opacity-40"
            )}
            aria-label={`Drag to reorder: ${status.name}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <DotsSixVerticalIcon className="size-4" weight="bold" />
          </button>
        ) : (
          <span className="size-7 shrink-0" />
        )}

        <StatusColorPicker
          kind={kind}
          category={status.category}
          value={status.color}
          disabled={disabled}
          onChange={onColorChange}
        />

        <div className="min-w-0 flex-1 py-2">
          <p className="truncate text-sm font-medium">
            {status.name}
            {status.isDefault ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · Default
              </span>
            ) : null}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={`Actions for ${status.name}`}
            >
              <DotsThreeIcon className="size-4" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onEdit}>
              <PencilSimpleIcon className="size-4" />
              Edit
            </DropdownMenuItem>
            {!status.isDefault ? (
              <DropdownMenuItem onSelect={onSetDefault}>
                Set as default
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <TrashIcon className="size-4" />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

function StatusEditRow({
  kind,
  category,
  name,
  description,
  color,
  pending,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onCancel,
  onSave,
}: {
  kind: StatusesSettings["kind"]
  category: StatusCategory
  name: string
  description: string
  color: string
  pending: boolean
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (color: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        <StatusColorPicker
          kind={kind}
          category={category}
          value={color}
          disabled={pending}
          onChange={onColorChange}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={name}
              maxLength={MAX_STATUS_NAME_LENGTH}
              disabled={pending}
              placeholder="Status name"
              className="h-8 max-w-[12rem]"
              autoFocus
              onChange={(event) => onNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onSave()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  onCancel()
                }
              }}
            />
            <Input
              value={description}
              maxLength={MAX_STATUS_DESCRIPTION_LENGTH}
              disabled={pending}
              placeholder="Description"
              className="h-8 min-w-[12rem] flex-1"
              onChange={(event) => onDescriptionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onSave()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  onCancel()
                }
              }}
            />
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || !name.trim()}
                onClick={onSave}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

function CategoryBlock({
  kind,
  category,
  statuses,
  canEdit,
  pending,
  editingId,
  draft,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSaveEdit,
  onAdd,
  onDelete,
  onColorChange,
  onSetDefault,
  onReorder,
}: {
  kind: StatusesSettings["kind"]
  category: StatusCategory
  statuses: StatusRecord[]
  canEdit: boolean
  pending: boolean
  editingId: string | null
  draft: { name: string; description: string; color: string } | null
  onStartEdit: (status: StatusRecord) => void
  onCancelEdit: () => void
  onDraftChange: (patch: Partial<{ name: string; description: string; color: string }>) => void
  onSaveEdit: () => void
  onAdd: () => void
  onDelete: (status: StatusRecord) => void
  onColorChange: (status: StatusRecord, color: string) => void
  onSetDefault: (status: StatusRecord) => void
  onReorder: (ordered: StatusRecord[]) => void
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const activeStatus = activeId
    ? (statuses.find((status) => status.id === activeId) ?? null)
    : null
  const sortable = canEdit && statuses.length > 1
  const canDrag = sortable && !editingId
  const canDeleteStatus = (status: StatusRecord) =>
    canEdit && !status.isDefault && statuses.length > 1

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id || !canDrag) return

    const oldIndex = statuses.findIndex((status) => status.id === active.id)
    const newIndex = statuses.findIndex((status) => status.id === over.id)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    onReorder(arrayMove(statuses, oldIndex, newIndex))
  }

  const rows = (
    <ul
      className={cn(
        "divide-y divide-border/40",
        activeId && "cursor-grabbing select-none"
      )}
    >
      {statuses.map((status) =>
        editingId === status.id && draft ? (
          <StatusEditRow
            key={status.id}
            kind={kind}
            category={status.category}
            name={draft.name}
            description={draft.description}
            color={draft.color}
            pending={pending}
            onNameChange={(name) => onDraftChange({ name })}
            onDescriptionChange={(description) =>
              onDraftChange({ description })
            }
            onColorChange={(color) => onDraftChange({ color })}
            onCancel={onCancelEdit}
            onSave={onSaveEdit}
          />
        ) : sortable ? (
          <SortableStatusRow
            key={status.id}
            status={status}
            kind={kind}
            disabled={pending}
            canDrag={canDrag}
            canDelete={canDeleteStatus(status)}
            onEdit={() => onStartEdit(status)}
            onDelete={() => onDelete(status)}
            onColorChange={(color) => onColorChange(status, color)}
            onSetDefault={() => onSetDefault(status)}
          />
        ) : (
          <li key={status.id} className="hover:bg-muted/40">
            <div className="flex items-center gap-1 px-2">
              {canEdit ? (
                <StatusColorPicker
                  kind={kind}
                  category={status.category}
                  value={status.color}
                  disabled={pending}
                  onChange={(color) => onColorChange(status, color)}
                />
              ) : (
                <span className="inline-flex size-7 items-center justify-center">
                  <StatusCategoryIcon
                    kind={kind}
                    category={status.category}
                    color={status.color}
                  />
                </span>
              )}
              <div className="min-w-0 flex-1 py-2">
                <p className="truncate text-sm font-medium">
                  {status.name}
                  {status.isDefault ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · Default
                    </span>
                  ) : null}
                </p>
                {usageLabel(status, kind) ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {usageLabel(status, kind)}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      aria-label={`Actions for ${status.name}`}
                    >
                      <DotsThreeIcon className="size-4" weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => onStartEdit(status)}>
                      <PencilSimpleIcon className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    {!status.isDefault ? (
                      <DropdownMenuItem onSelect={() => onSetDefault(status)}>
                        Set as default
                      </DropdownMenuItem>
                    ) : null}
                    {canDeleteStatus(status) ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => onDelete(status)}
                        >
                          <TrashIcon className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </li>
        )
      )}
    </ul>
  )

  return (
    <div data-slot="surface" className="overflow-hidden rounded-lg">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {categoryLabel(kind, category)}
        </p>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Add status to ${categoryLabel(kind, category)}`}
            onClick={onAdd}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {sortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={statuses.map((status) => status.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows}
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              duration: 180,
              easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {activeStatus ? (
              <div className="overflow-hidden rounded-lg bg-card shadow-lg">
                <StatusRowBody
                  status={activeStatus}
                  subtitle={usageLabel(activeStatus, kind)}
                  className="bg-card"
                  leading={
                    <>
                      <span className="inline-flex size-7 items-center justify-center text-foreground">
                        <DotsSixVerticalIcon className="size-4" weight="bold" />
                      </span>
                      <StatusCategoryIcon
                        kind={kind}
                        category={activeStatus.category}
                        color={activeStatus.color}
                      />
                    </>
                  }
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        rows
      )}
    </div>
  )
}

export function StatusesSettingsForm({
  initialSettings,
  backHref,
  backLabel,
}: {
  initialSettings: StatusesSettings
  backHref?: string
  backLabel?: string
}) {
  const router = useRouter()
  const [settings, setSettings] = React.useState(initialSettings)
  const settingsRef = React.useRef(settings)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )
  const requestIds = React.useRef(new Map<string, number>())

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<{
    name: string
    description: string
    color: string
  } | null>(null)

  const [deleteTarget, setDeleteTarget] = React.useState<StatusRecord | null>(
    null
  )
  const [replacementId, setReplacementId] = React.useState<string>("")

  const pendingKeysRef = React.useRef(pendingKeys)
  pendingKeysRef.current = pendingKeys

  React.useEffect(() => {
    if (pendingKeysRef.current.size > 0) return
    setSettings(initialSettings)
    settingsRef.current = initialSettings
  }, [initialSettings])

  function setSettingsSafe(next: StatusesSettings) {
    settingsRef.current = next
    setSettings(next)
  }

  function patchStatusLocal(
    statusId: string,
    patch: Partial<StatusRecord>
  ) {
    const current = settingsRef.current
    setSettingsSafe({
      ...current,
      statuses: current.statuses.map((status) =>
        status.id === statusId ? { ...status, ...patch } : status
      ),
    })
  }

  function applyServerStatus(result: StatusesSettings, statusId: string) {
    const current = settingsRef.current
    const pending = pendingKeysRef.current
    if (pending.size === 0) {
      setSettingsSafe(result)
      return
    }

    setSettingsSafe({
      ...result,
      statuses: result.statuses.map((server) => {
        if (server.id === statusId) return server
        const local = current.statuses.find((item) => item.id === server.id)
        if (!local) return server
        const keepLocal =
          pending.has(`color:${server.id}`) ||
          pending.has(`edit:${server.id}`) ||
          pending.has(`default:${server.id}`)
        if (!keepLocal) return server
        return {
          ...server,
          name: local.name,
          description: local.description,
          color: local.color,
          isDefault: local.isDefault,
        }
      }),
    })
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

  const pending = pendingKeys.size > 0
  const categories = categoriesForKind(settings.kind)

  const page = (
    <SettingsPage
      title={settings.kind === "issue" ? "Issue statuses" : "Project statuses"}
      description={
        settings.kind === "issue"
          ? "Issue statuses define the workflow that issues go through from start to completion."
          : "Project statuses define the workflow that projects go through from start to completion."
      }
      width="narrow"
    >
      <div className="space-y-4">
        {categories.map((category) => {
          const statuses = settings.statuses
            .filter((status) => status.category === category)
            .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

          return (
            <CategoryBlock
              key={category}
              kind={settings.kind}
              category={category}
              statuses={statuses}
              canEdit={settings.canEdit}
              pending={pending}
              editingId={editingId}
              draft={
                editingId && statuses.some((s) => s.id === editingId)
                  ? draft
                  : null
              }
              onStartEdit={(status) => {
                setEditingId(status.id)
                setDraft({
                  name: status.name,
                  description: status.description,
                  color: status.color,
                })
              }}
              onCancelEdit={() => {
                setEditingId(null)
                setDraft(null)
              }}
              onDraftChange={(patch) => {
                setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
              }}
              onSaveEdit={async () => {
                if (!editingId || !draft) return
                const existing = settingsRef.current.statuses.find(
                  (status) => status.id === editingId
                )
                if (!existing) return

                const name = normalizeStatusName(draft.name)
                if (!name) {
                  toast.error("Enter a status name.", { id: TOAST_ID })
                  return
                }

                if (statusDraftUnchanged(existing, draft)) {
                  setEditingId(null)
                  setDraft(null)
                  return
                }

                const key = `edit:${editingId}`
                const requestId = beginPending(key)
                const previousStatus = { ...existing }
                const nextPatch = {
                  name,
                  description: normalizeStatusDescription(draft.description),
                  color: draft.color,
                }
                patchStatusLocal(editingId, nextPatch)
                setEditingId(null)
                setDraft(null)

                const result = await updateStatus({
                  slug: settingsRef.current.workspaceSlug,
                  kind: settingsRef.current.kind,
                  teamId: settingsRef.current.teamId,
                  statusId: editingId,
                  data: nextPatch,
                })

                if (!endPending(key, requestId)) return
                if (result.error || !result.settings) {
                  patchStatusLocal(editingId, {
                    name: previousStatus.name,
                    description: previousStatus.description,
                    color: previousStatus.color,
                  })
                  toast.error(result.error ?? "Could not save status.", {
                    id: TOAST_ID,
                  })
                  return
                }
                applyServerStatus(result.settings, editingId)
                toast.success("Status updated", { id: TOAST_ID })
                router.refresh()
              }}
              onAdd={async () => {
                if (editingId) {
                  setEditingId(null)
                  setDraft(null)
                }
                const key = `add:${category}`
                const requestId = beginPending(key)
                const previous = settingsRef.current
                const result = await addStatusInCategory({
                  slug: previous.workspaceSlug,
                  kind: previous.kind,
                  teamId: previous.teamId,
                  category,
                })
                if (!endPending(key, requestId)) return
                if (result.error || !result.settings) {
                  toast.error(result.error ?? "Could not add status.", {
                    id: TOAST_ID,
                  })
                  return
                }
                setSettingsSafe(result.settings)
                const created = result.settings.statuses
                  .filter((status) => status.category === category)
                  .sort((a, b) => b.position - a.position)[0]
                if (created) {
                  setEditingId(created.id)
                  setDraft({
                    name: created.name,
                    description: created.description,
                    color: created.color,
                  })
                }
                toast.success("Status added", { id: TOAST_ID })
                router.refresh()
              }}
              onDelete={(status) => {
                setDeleteTarget(status)
                const replacement =
                  settingsRef.current.statuses.find(
                    (item) =>
                      item.id !== status.id && item.category === status.category
                  ) ??
                  settingsRef.current.statuses.find(
                    (item) => item.id !== status.id
                  )
                setReplacementId(replacement?.id ?? "")
              }}
              onColorChange={async (status, color) => {
                if (color === status.color) return
                const key = `color:${status.id}`
                const requestId = beginPending(key)
                const previousColor = status.color
                patchStatusLocal(status.id, { color })
                const snapshot = settingsRef.current
                const result = await updateStatus({
                  slug: snapshot.workspaceSlug,
                  kind: snapshot.kind,
                  teamId: snapshot.teamId,
                  statusId: status.id,
                  data: { color },
                })
                if (!endPending(key, requestId)) return
                if (result.error || !result.settings) {
                  patchStatusLocal(status.id, { color: previousColor })
                  toast.error(result.error ?? "Could not update color.", {
                    id: TOAST_ID,
                  })
                  return
                }
                applyServerStatus(result.settings, status.id)
              }}
              onSetDefault={async (status) => {
                if (status.isDefault) return
                const key = `default:${status.id}`
                const requestId = beginPending(key)
                const previous = settingsRef.current
                const previousDefaultId =
                  previous.statuses.find((item) => item.isDefault)?.id ?? null
                setSettingsSafe({
                  ...previous,
                  statuses: previous.statuses.map((item) => ({
                    ...item,
                    isDefault: item.id === status.id,
                  })),
                })
                const result = await updateStatus({
                  slug: previous.workspaceSlug,
                  kind: previous.kind,
                  teamId: previous.teamId,
                  statusId: status.id,
                  data: { isDefault: true },
                })
                if (!endPending(key, requestId)) return
                if (result.error || !result.settings) {
                  setSettingsSafe({
                    ...settingsRef.current,
                    statuses: settingsRef.current.statuses.map((item) => ({
                      ...item,
                      isDefault: previousDefaultId
                        ? item.id === previousDefaultId
                        : item.id === status.id
                          ? false
                          : item.isDefault,
                    })),
                  })
                  toast.error(result.error ?? "Could not set default.", {
                    id: TOAST_ID,
                  })
                  return
                }
                setSettingsSafe(result.settings)
                toast.success("Default status updated", { id: TOAST_ID })
                router.refresh()
              }}
              onReorder={async (ordered) => {
                const key = `reorder:${category}`
                const requestId = beginPending(key)
                const previous = settingsRef.current
                const others = previous.statuses.filter(
                  (status) => status.category !== category
                )
                const nextStatuses = [
                  ...others,
                  ...ordered.map((status, index) => ({
                    ...status,
                    position: index,
                  })),
                ]
                setSettingsSafe({ ...previous, statuses: nextStatuses })

                const result = await reorderStatuses({
                  slug: previous.workspaceSlug,
                  kind: previous.kind,
                  teamId: previous.teamId,
                  category,
                  orderedIds: ordered.map((status) => status.id),
                })
                if (!endPending(key, requestId)) return
                if (result.error || !result.settings) {
                  setSettingsSafe(previous)
                  toast.error(result.error ?? "Could not reorder statuses.", {
                    id: TOAST_ID,
                  })
                  return
                }
                setSettingsSafe(result.settings)
                router.refresh()
              }}
            />
          )
        })}
      </div>

      {!settings.canEdit ? (
        <SettingsSection framed={false}>
          <p className="text-sm text-muted-foreground">
            {settings.deletionLocked
              ? "Settings are locked while workspace deletion is scheduled."
              : settings.kind === "issue"
                ? "Only team managers can edit issue statuses."
                : "Only workspace owners and admins can edit project statuses."}
          </p>
        </SettingsSection>
      ) : null}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setReplacementId("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete status</DialogTitle>
            <DialogDescription>
              {deleteTarget?.usageCount
                ? `Move ${deleteTarget.usageCount} issue${deleteTarget.usageCount === 1 ? "" : "s"} to another status, then delete “${deleteTarget.name}”.`
                : `Delete “${deleteTarget?.name ?? "this status"}”? This can’t be undone.`}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && deleteTarget.usageCount > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Replacement status</p>
              <Select value={replacementId} onValueChange={setReplacementId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a status" />
                </SelectTrigger>
                <SelectContent>
                  {settings.statuses
                    .filter((status) => status.id !== deleteTarget.id)
                    .map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDeleteTarget(null)
                setReplacementId("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                pending ||
                Boolean(deleteTarget?.usageCount && !replacementId)
              }
              onClick={async () => {
                if (!deleteTarget) return
                const key = `delete:${deleteTarget.id}`
                const requestId = beginPending(key)
                const previous = settingsRef.current
                const result = await deleteStatus({
                  slug: previous.workspaceSlug,
                  kind: previous.kind,
                  teamId: previous.teamId,
                  statusId: deleteTarget.id,
                  replacementStatusId: replacementId || null,
                })
                if (!endPending(key, requestId)) return
                if (result.error || !result.settings) {
                  toast.error(result.error ?? "Could not delete status.", {
                    id: TOAST_ID,
                  })
                  return
                }
                setSettingsSafe(result.settings)
                setDeleteTarget(null)
                setReplacementId("")
                if (editingId === deleteTarget.id) {
                  setEditingId(null)
                  setDraft(null)
                }
                toast.success("Status deleted", { id: TOAST_ID })
                router.refresh()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  )

  if (backHref) {
    return (
      <SettingsSubpage backHref={backHref} backLabel={backLabel ?? "Back"}>
        {page}
      </SettingsSubpage>
    )
  }

  return page
}
