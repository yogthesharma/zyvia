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
import { saveWorkspace, type OnboardingState } from "@/lib/onboarding/actions"
import { slugify } from "@/lib/slug"

const initial: OnboardingState = {}

export function WorkspaceStepForm() {
  const [state, action, pending] = useActionState(saveWorkspace, initial)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)

  return (
    <form action={action} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Workspace name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              if (!slugTouched) setSlug(slugify(next))
            }}
            placeholder="Acme"
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">URL slug</FieldLabel>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(slugify(e.target.value))
            }}
            placeholder="acme"
          />
          <FieldDescription>Used in links like /w/{slug || "acme"}</FieldDescription>
        </Field>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Continue"}
      </Button>
    </form>
  )
}
