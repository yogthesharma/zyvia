"use client"

import * as React from "react"
import { CheckIcon, CircleIcon } from "@phosphor-icons/react"
import { HexColorPicker } from "react-colorful"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DEFAULT_LABEL_COLOR,
  LABEL_COLOR_PRESETS,
  normalizeLabelColor,
} from "@/lib/labels/schema"
import { cn } from "@/lib/utils"

const COMMIT_DEBOUNCE_MS = 350

export function LabelColorSwatch({
  color,
  className,
}: {
  color: string
  className?: string
}) {
  return (
    <span
      className={cn("inline-block size-3.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color || DEFAULT_LABEL_COLOR }}
      aria-hidden
    />
  )
}

export function LabelColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  /** Committed color — presets immediate; custom picker debounced; flushed on close. */
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [customOpen, setCustomOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value || DEFAULT_LABEL_COLOR)
  const draftRef = React.useRef(draft)
  const valueRef = React.useRef(value || DEFAULT_LABEL_COLOR)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastEmittedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    valueRef.current = value || DEFAULT_LABEL_COLOR
    // Parent confirmed (or rolled back) — clear emit guard and sync draft when closed.
    if (lastEmittedRef.current && lastEmittedRef.current === valueRef.current) {
      lastEmittedRef.current = null
    }
    if (!open) {
      setDraft(valueRef.current)
      draftRef.current = valueRef.current
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

  function emit(color: string) {
    const parsed = normalizeLabelColor(color)
    if (!parsed) return
    if (parsed === valueRef.current) return
    if (parsed === lastEmittedRef.current) return
    lastEmittedRef.current = parsed
    onChange(parsed)
  }

  function commit(color: string, options?: { immediate?: boolean }) {
    const parsed = normalizeLabelColor(color)
    if (!parsed) return
    draftRef.current = parsed
    setDraft(parsed)

    if (options?.immediate) {
      clearTimer()
      emit(parsed)
      return
    }

    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      emit(parsed)
    }, COMMIT_DEBOUNCE_MS)
  }

  function flushPending() {
    clearTimer()
    emit(draftRef.current)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      flushPending()
      setCustomOpen(false)
    } else {
      setDraft(valueRef.current)
      draftRef.current = valueRef.current
    }
    setOpen(next)
  }

  const display = open ? draft : value || DEFAULT_LABEL_COLOR

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="Change label color"
        >
          <LabelColorSwatch color={display} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        {!customOpen ? (
          <div className="flex items-center gap-1.5">
            {LABEL_COLOR_PRESETS.map((preset) => {
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
                    const parsed = normalizeLabelColor(next)
                    if (parsed) commit(parsed)
                  }}
                  onBlur={() => {
                    const parsed = normalizeLabelColor(draft)
                    if (parsed) {
                      commit(parsed, { immediate: true })
                    } else {
                      setDraft(valueRef.current)
                      draftRef.current = valueRef.current
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
              color={normalizeLabelColor(draft) ?? valueRef.current}
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
