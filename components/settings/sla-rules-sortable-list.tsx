"use client"

import * as React from "react"
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
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
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
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { durationLabel, priorityLabel } from "@/lib/sla/schema"
import type { SlaRule } from "@/lib/sla/types"
import { cn } from "@/lib/utils"

function ruleSummary(rule: SlaRule) {
  const priorities = rule.filters.priority.map(priorityLabel).join(", ")
  const when = priorities || "No priorities"
  if (rule.action === "remove") {
    return `When Priority is ${when}, remove the SLA`
  }
  return `When Priority is ${when}, add a ${durationLabel(rule)} SLA`
}

function RuleRowContent({
  rule,
  index,
  total,
  dragHandle,
  actions,
  className,
}: {
  rule: SlaRule
  index: number
  total: number
  dragHandle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-2 px-3 py-3.5", className)}>
      {dragHandle}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{ruleSummary(rule)}</p>
        <p className="text-xs text-muted-foreground">
          Rule {index + 1} of {total}
        </p>
      </div>
      {actions}
    </div>
  )
}

function SortableRuleRow({
  rule,
  index,
  total,
  disabled,
  onEdit,
  onDelete,
}: {
  rule: SlaRule
  index: number
  total: number
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ??
      "transform 200ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 150ms ease",
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border-b border-border bg-card/40 last:border-b-0",
        "transition-[background-color,opacity,box-shadow] duration-150",
        isDragging && "z-20 opacity-40 shadow-none"
      )}
    >
      {isDragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 inset-y-2 rounded-md border border-dashed border-foreground/25 bg-muted/40"
        />
      ) : null}
      <RuleRowContent
        rule={rule}
        index={index}
        total={total}
        className={cn(isDragging && "invisible")}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            className={cn(
              "mt-0.5 inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground",
              "hover:bg-muted hover:text-foreground active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "pointer-events-none opacity-40"
            )}
            aria-label={`Drag to reorder: ${ruleSummary(rule)}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <DotsSixVerticalIcon className="size-4" weight="bold" />
          </button>
        }
        actions={
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label="Edit rule"
              onClick={onEdit}
            >
              <PencilSimpleIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label="Delete rule"
              onClick={onDelete}
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </div>
        }
      />
    </li>
  )
}

export function SlaRulesSortableList({
  rules,
  canEdit,
  pending,
  onReorder,
  onEdit,
  onDelete,
}: {
  rules: SlaRule[]
  canEdit: boolean
  pending: boolean
  onReorder: (next: SlaRule[]) => void
  onEdit: (rule: SlaRule) => void
  onDelete: (rule: SlaRule) => void
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

  const activeRule = activeId
    ? (rules.find((rule) => rule.id === activeId) ?? null)
    : null
  const activeIndex = activeRule
    ? rules.findIndex((rule) => rule.id === activeRule.id)
    : -1

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = rules.findIndex((rule) => rule.id === active.id)
    const newIndex = rules.findIndex((rule) => rule.id === over.id)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    onReorder(arrayMove(rules, oldIndex, newIndex))
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  if (rules.length === 0) {
    return (
      <p className="px-4 py-3.5 text-sm text-muted-foreground">
        No automation rules yet.
      </p>
    )
  }

  if (!canEdit) {
    return (
      <ul className="divide-y divide-border">
        {rules.map((rule, index) => (
          <li key={rule.id}>
            <RuleRowContent
              rule={rule}
              index={index}
              total={rules.length}
              className="px-4"
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={rules.map((rule) => rule.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className={cn(
            "relative",
            activeId && "cursor-grabbing select-none"
          )}
          aria-label="Automation rules. Drag handles to reorder; first matching rule wins."
        >
          {rules.map((rule, index) => (
            <SortableRuleRow
              key={rule.id}
              rule={rule}
              index={index}
              total={rules.length}
              disabled={pending}
              onEdit={() => onEdit(rule)}
              onDelete={() => onDelete(rule)}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={{
        duration: 180,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      }}>
        {activeRule ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg ring-1 ring-foreground/10">
            <RuleRowContent
              rule={activeRule}
              index={Math.max(activeIndex, 0)}
              total={rules.length}
              className="bg-card"
              dragHandle={
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center text-foreground">
                  <DotsSixVerticalIcon className="size-4" weight="bold" />
                </span>
              }
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
