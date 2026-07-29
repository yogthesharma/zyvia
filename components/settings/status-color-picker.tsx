"use client"

import * as React from "react"
import { CheckIcon, CircleIcon } from "@phosphor-icons/react"
import { HexColorPicker } from "react-colorful"

import { StatusCategoryIcon } from "@/components/settings/status-category-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DEFAULT_STATUS_COLOR,
  STATUS_COLOR_PRESETS,
  normalizeStatusColor,
} from "@/lib/statuses/schema"
import type { StatusCategory, StatusKind } from "@/lib/statuses/types"

const COMMIT_DEBOUNCE_MS = 350

export function StatusColorPicker({
  kind,
  category,
  value,
  onChange,
  disabled,
}: {
  kind: StatusKind
  category: StatusCategory
  value: string
  /** Committed color — presets immediate, custom picker debounced, flushed on close. */
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [customOpen, setCustomOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value || DEFAULT_STATUS_COLOR)
  const draftRef = React.useRef(draft)
  const committedRef = React.useRef(value || DEFAULT_STATUS_COLOR)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    committedRef.current = value || DEFAULT_STATUS_COLOR
    if (!open) {
      setDraft(value || DEFAULT_STATUS_COLOR)
      draftRef.current = value || DEFAULT_STATUS_COLOR
    }
  }, [value, open])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function commit(color: string, options?: { immediate?: boolean }) {
    const parsed = normalizeStatusColor(color)
    if (!parsed) return
    draftRef.current = parsed
    setDraft(parsed)

    if (options?.immediate) {
      clearTimer()
      if (parsed === committedRef.current) return
      committedRef.current = parsed
      onChange(parsed)
      return
    }

    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      if (parsed === committedRef.current) return
      committedRef.current = parsed
      onChange(parsed)
    }, COMMIT_DEBOUNCE_MS)
  }

  function flushPending() {
    clearTimer()
    const parsed = normalizeStatusColor(draftRef.current)
    if (!parsed || parsed === committedRef.current) return
    committedRef.current = parsed
    onChange(parsed)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      flushPending()
      setCustomOpen(false)
    } else {
      setDraft(committedRef.current)
      draftRef.current = committedRef.current
    }
    setOpen(next)
  }

  const display = open ? draft : value || DEFAULT_STATUS_COLOR

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="Change status color"
        >
          <StatusCategoryIcon
            kind={kind}
            category={category}
            color={display}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        {!customOpen ? (
          <div className="flex items-center gap-1.5">
            {STATUS_COLOR_PRESETS.map((preset) => {
              const selected = display.toLowerCase() === preset.toLowerCase()
              return (
                <button
                  key={preset}
                  type="button"
                  className="relative inline-flex size-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: preset }}
                  aria-label={`Select ${preset}`}
                  onClick={() => {
                    commit(preset, { immediate: true })
                    setOpen(false)
                  }}
                >
                  {selected ? (
                    <CheckIcon
                      className="size-3 text-white drop-shadow"
                      weight="bold"
                    />
                  ) : null}
                </button>
              )
            })}
            <button
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-full bg-[conic-gradient(from_0deg,#eb5757,#f2c94c,#4cb782,#4ea7fc,#8b5cf6,#eb5757)]"
              aria-label="Custom color"
              onClick={() => setCustomOpen(true)}
            >
              <CircleIcon className="size-2 text-white/90" weight="fill" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  HEX
                </span>
                <Input
                  value={draft}
                  maxLength={7}
                  className="h-7 w-[5.5rem] font-mono text-xs"
                  onChange={(event) => {
                    const next = event.target.value
                    setDraft(next)
                    draftRef.current = next
                    const parsed = normalizeStatusColor(next)
                    if (parsed) commit(parsed)
                  }}
                  onBlur={() => {
                    const parsed = normalizeStatusColor(draft)
                    if (parsed) {
                      commit(parsed, { immediate: true })
                    } else {
                      setDraft(committedRef.current)
                      draftRef.current = committedRef.current
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur()
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setCustomOpen(false)}
              >
                Presets
              </Button>
            </div>
            <HexColorPicker
              color={normalizeStatusColor(draft) ?? committedRef.current}
              onChange={(next) => {
                setDraft(next)
                draftRef.current = next
                commit(next)
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
