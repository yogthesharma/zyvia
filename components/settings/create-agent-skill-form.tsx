"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { SettingsSubpage } from "@/components/app/settings-page"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  createAgentSkill,
  createTeamAgentSkill,
  updateAgentSkill,
  updateTeamAgentSkill,
} from "@/lib/agent-personalization/actions"
import {
  MAX_SKILL_INSTRUCTIONS_LENGTH,
  MAX_SKILL_NAME_LENGTH,
  normalizeSkillInstructions,
  normalizeSkillName,
} from "@/lib/agent-personalization/schema"
import type { AgentSkill } from "@/lib/agent-personalization/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "agent-skill-form"

export function AgentSkillForm({
  workspaceSlug,
  skill,
  teamKey,
  readOnly,
}: {
  workspaceSlug: string
  skill?: AgentSkill
  /** When set, create/edit a team skill instead of a personal skill. */
  teamKey?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const isEdit = Boolean(skill)
  const isTeam = Boolean(teamKey)
  const [name, setName] = React.useState(skill?.name ?? "")
  const [instructions, setInstructions] = React.useState(
    skill?.instructions ?? ""
  )
  const [pending, setPending] = React.useState(false)

  const backHref = isTeam
    ? `/w/${workspaceSlug}/settings/teams/${teamKey!.toLowerCase()}/agent-skills`
    : `/w/${workspaceSlug}/settings/agent-personalization`
  const backLabel = isTeam ? "Agent skills" : "Agent personalization"

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || readOnly) return

    const nextName = normalizeSkillName(name)
    const nextInstructions = normalizeSkillInstructions(instructions)

    if (!nextName) {
      toast.error("Skill name is required.", { id: TOAST_ID })
      return
    }
    if (nextName.length > MAX_SKILL_NAME_LENGTH) {
      toast.error("Skill name is too long.", { id: TOAST_ID })
      return
    }
    if (nextInstructions.length > MAX_SKILL_INSTRUCTIONS_LENGTH) {
      toast.error("Instructions are too long.", { id: TOAST_ID })
      return
    }

    if (
      isEdit &&
      skill &&
      nextName === normalizeSkillName(skill.name) &&
      nextInstructions === normalizeSkillInstructions(skill.instructions)
    ) {
      window.location.assign(backHref)
      return
    }

    setPending(true)
    try {
      const payload = {
        name: nextName,
        instructions: nextInstructions,
      }
      const result = isTeam
        ? isEdit
          ? await updateTeamAgentSkill(
              workspaceSlug,
              teamKey!,
              skill!.id,
              payload
            )
          : await createTeamAgentSkill(workspaceSlug, teamKey!, payload)
        : isEdit
          ? await updateAgentSkill(workspaceSlug, skill!.id, payload)
          : await createAgentSkill(workspaceSlug, payload)

      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      toast.success(isEdit ? "Skill updated" : "Skill created", {
        id: TOAST_ID,
      })
      window.location.assign(result.redirectTo ?? backHref)
      return
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEdit
            ? "Could not update skill."
            : "Could not create skill.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <SettingsSubpage backHref={backHref} backLabel={backLabel}>
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-3xl space-y-6 px-8 pt-12 pb-8"
      >
        <input
          type="text"
          value={name}
          disabled={pending || readOnly}
          maxLength={MAX_SKILL_NAME_LENGTH}
          placeholder="Skill name"
          aria-label="Skill name"
          autoFocus={!readOnly}
          className={cn(
            "w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50",
            (pending || readOnly) && "opacity-50"
          )}
          onChange={(event) => setName(event.target.value)}
        />

        <div data-slot="surface" className="overflow-hidden rounded-xl">
          <Textarea
            value={instructions}
            disabled={pending || readOnly}
            maxLength={MAX_SKILL_INSTRUCTIONS_LENGTH}
            placeholder="Add instructions..."
            aria-label="Skill instructions"
            className={cn(
              "min-h-56 resize-y rounded-none border-0 bg-transparent focus-visible:ring-0",
              (pending || readOnly) && "opacity-50"
            )}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => router.push(backHref)}
          >
            {readOnly ? "Back" : "Cancel"}
          </Button>
          {!readOnly ? (
            <Button type="submit" size="sm" disabled={pending || !name.trim()}>
              {pending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create"}
            </Button>
          ) : null}
        </div>
      </form>
    </SettingsSubpage>
  )
}
