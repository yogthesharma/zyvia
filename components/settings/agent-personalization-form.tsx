"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { SettingsPage } from "@/components/app/settings-page"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateAgentPersonalization } from "@/lib/agent-personalization/actions"
import {
  MAX_GUIDANCE_LENGTH,
  normalizeGuidance,
} from "@/lib/agent-personalization/schema"
import type {
  AgentPersonalization,
  AgentSkill,
} from "@/lib/agent-personalization/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "agent-personalization-save"

function formatRelativeTime(iso: string | null, prefix: string) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null

  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 45) return `${prefix} just now`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${prefix} ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${prefix} ${hours} ${hours === 1 ? "hour" : "hours"} ago`
  }
  const days = Math.round(hours / 24)
  if (days < 45) {
    return `${prefix} ${days} ${days === 1 ? "day" : "days"} ago`
  }
  const months = Math.round(days / 30)
  if (months < 18) {
    return `${prefix} ${months} ${months === 1 ? "month" : "months"} ago`
  }
  const years = Math.round(days / 365)
  return `${prefix} ${years} ${years === 1 ? "year" : "years"} ago`
}

export function AgentPersonalizationForm({
  initialSettings,
  initialSkills,
  workspaceSlug,
}: {
  initialSettings: AgentPersonalization
  initialSkills: AgentSkill[]
  workspaceSlug: string
}) {
  const [settings, setSettings] = React.useState(initialSettings)
  const [guidance, setGuidance] = React.useState(initialSettings.guidance)
  const [skills, setSkills] = React.useState(initialSkills)
  const [pending, setPending] = React.useState(false)
  const settingsRef = React.useRef(settings)
  const pendingRef = React.useRef(false)
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    if (pendingRef.current) return
    setSettings(initialSettings)
    setGuidance(initialSettings.guidance)
    settingsRef.current = initialSettings
  }, [initialSettings])

  React.useEffect(() => {
    setSkills(initialSkills)
  }, [initialSkills])

  React.useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  async function commitGuidance(raw: string) {
    const next = normalizeGuidance(raw)
    if (next.length > MAX_GUIDANCE_LENGTH) {
      setGuidance(settingsRef.current.guidance)
      toast.error(
        `Guidance must be ${MAX_GUIDANCE_LENGTH.toLocaleString()} characters or fewer.`,
        { id: TOAST_ID }
      )
      return
    }
    if (next === settingsRef.current.guidance) {
      setGuidance(settingsRef.current.guidance)
      return
    }

    const previous = settingsRef.current
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setPending(true)
    setGuidance(next)
    settingsRef.current = {
      ...previous,
      guidance: next,
      guidanceUpdatedAt: new Date().toISOString(),
    }
    setSettings(settingsRef.current)

    try {
      const result = await updateAgentPersonalization({ guidance: next })
      if (requestIdRef.current !== requestId) return

      if (result.error) {
        settingsRef.current = previous
        setSettings(previous)
        setGuidance(previous.guidance)
        toast.error(result.error, { id: TOAST_ID })
        return
      }

      if (result.settings) {
        settingsRef.current = result.settings
        setSettings(result.settings)
        setGuidance(result.settings.guidance)
      }
      toast.success("Agent personalization saved", { id: TOAST_ID })
    } catch (error) {
      if (requestIdRef.current !== requestId) return
      settingsRef.current = previous
      setSettings(previous)
      setGuidance(previous.guidance)
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save agent personalization.",
        { id: TOAST_ID }
      )
    } finally {
      if (requestIdRef.current === requestId) setPending(false)
    }
  }

  const lastEdited = formatRelativeTime(
    settings.guidanceUpdatedAt,
    "Last edited"
  )
  const newSkillHref = `/w/${workspaceSlug}/settings/skill/new`

  return (
    <SettingsPage
      title="Agent personalization"
      description="Your personal settings for Zyvia Agent."
    >
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Guidance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide personal instructions and context for the Zyvia Agent when
            responding to conversations.
          </p>
        </div>
        <Textarea
          value={guidance}
          disabled={pending}
          maxLength={MAX_GUIDANCE_LENGTH}
          placeholder="Enter personal guidance for the Zyvia Agent (optional)..."
          className={cn(
            "min-h-36 resize-y bg-card/40",
            pending && "opacity-50"
          )}
          onChange={(event) => setGuidance(event.target.value)}
          onBlur={() => void commitGuidance(guidance)}
        />
        {lastEdited ? (
          <p className="text-xs text-muted-foreground">{lastEdited}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Skills</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable prompts auto-selected by the agent or invoked via slash
            commands.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg bg-muted/20">
          {skills.length === 0 ? (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">No skills created</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="New skill"
                asChild
              >
                <Link href={newSkillHref}>
                  <PlusIcon className="size-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <ul>
                {skills.map((skill) => {
                  const updated = formatRelativeTime(
                    skill.updatedAt,
                    "Updated"
                  )
                  return (
                    <li key={skill.id}>
                      <Link
                        href={`/w/${workspaceSlug}/settings/skill/${skill.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {skill.name}
                        </span>
                        {updated ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {updated}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <div className="flex justify-end bg-muted/30 px-2 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New skill"
                  asChild
                >
                  <Link href={newSkillHref}>
                    <PlusIcon className="size-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </SettingsPage>
  )
}
