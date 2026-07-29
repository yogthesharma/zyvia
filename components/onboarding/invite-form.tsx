"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { saveInvites, type OnboardingState } from "@/lib/onboarding/actions"

const initial: OnboardingState = {}

export function InviteStepForm() {
  const [state, action, pending] = useActionState(saveInvites, initial)

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="emails">Teammate emails</FieldLabel>
            <Textarea
              id="emails"
              name="emails"
              rows={4}
              placeholder="ada@acme.com, alan@acme.com"
            />
            <FieldDescription>
              Optional for now — invites are saved, email sending comes later.
            </FieldDescription>
          </Field>
          {state.error ? <FieldError>{state.error}</FieldError> : null}
        </FieldGroup>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Finishing…" : "Finish setup"}
        </Button>
      </form>
      <form action={action}>
        <input type="hidden" name="skip" value="1" />
        <Button
          type="submit"
          variant="ghost"
          disabled={pending}
          className="w-full"
        >
          Skip for now
        </Button>
      </form>
    </div>
  )
}
