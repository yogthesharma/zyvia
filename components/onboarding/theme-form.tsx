"use client"

import { useActionState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { saveTheme, type OnboardingState } from "@/lib/onboarding/actions"
import { cn } from "@/lib/utils"

const initial: OnboardingState = {}

const options = [
  { value: "dark", label: "Dark", hint: "Default Linear-like look" },
  { value: "light", label: "Light", hint: "Bright workspace" },
  { value: "system", label: "System", hint: "Match your OS" },
] as const

export function ThemeStepForm({ defaultTheme }: { defaultTheme?: string }) {
  const { setTheme, theme } = useTheme()
  const [state, action, pending] = useActionState(saveTheme, initial)

  useEffect(() => {
    if (
      defaultTheme === "light" ||
      defaultTheme === "dark" ||
      defaultTheme === "system"
    ) {
      if (theme !== defaultTheme) setTheme(defaultTheme)
    }
    // Only sync from server default once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form
      action={action}
      className="flex flex-col gap-6"
      onChange={(event) => {
        const target = event.target
        if (!(target instanceof HTMLInputElement)) return
        if (target.name === "theme" && target.checked) {
          if (
            target.value === "light" ||
            target.value === "dark" ||
            target.value === "system"
          ) {
            setTheme(target.value)
          }
        }
      }}
    >
      <div className="grid gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg bg-muted/20 p-4 transition-colors hover:bg-muted/35 has-[:checked]:bg-muted/50"
            )}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              defaultChecked={(defaultTheme ?? "dark") === option.value}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </div>
      {state.error ? <FieldError>{state.error}</FieldError> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  )
}
