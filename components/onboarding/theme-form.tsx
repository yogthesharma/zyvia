"use client"

import { useActionState } from "react"

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
  const [state, action, pending] = useActionState(saveTheme, initial)

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors has-[:checked]:border-foreground"
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
