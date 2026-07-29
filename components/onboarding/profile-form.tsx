"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  saveProfileName,
  type OnboardingState,
} from "@/lib/onboarding/actions"

const initial: OnboardingState = {}

export function ProfileStepForm({ defaultName }: { defaultName?: string }) {
  const [state, action, pending] = useActionState(saveProfileName, initial)

  return (
    <form action={action} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Your name</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            required
            defaultValue={defaultName}
            placeholder="Ada Lovelace"
            autoFocus
          />
        </Field>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  )
}
