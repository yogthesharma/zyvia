"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { saveTeam, type OnboardingState } from "@/lib/onboarding/actions"
import { teamKeyFromName } from "@/lib/slug"

const initial: OnboardingState = {}

export function TeamStepForm() {
  const [state, action, pending] = useActionState(saveTeam, initial)
  const [name, setName] = useState("Engineering")
  const [key, setKey] = useState("ENG")
  const [keyTouched, setKeyTouched] = useState(false)

  return (
    <form action={action} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Team name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              if (!keyTouched) setKey(teamKeyFromName(next))
            }}
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="key">Issue prefix</FieldLabel>
          <Input
            id="key"
            name="key"
            required
            maxLength={4}
            value={key}
            onChange={(e) => {
              setKeyTouched(true)
              setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))
            }}
            placeholder="ENG"
          />
          <FieldDescription>
            Issues will look like {key || "ENG"}-1, {key || "ENG"}-2, …
          </FieldDescription>
        </Field>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Continue"}
      </Button>
    </form>
  )
}
