"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { Value } from "platejs"

import { RichTextEditor } from "@/components/rich-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createIssueAction } from "@/lib/issues/actions"
import { EMPTY_DOC } from "@/lib/rich-editor/schema"
import type { RichMentionable } from "@/lib/rich-editor/types"

type TeamOption = { id: string; key: string; name: string }

export function CreateIssueForm({
  workspaceId,
  workspaceSlug,
  teams,
  mentionables,
}: {
  workspaceId: string
  workspaceSlug: string
  teams: TeamOption[]
  mentionables: RichMentionable[]
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [teamId, setTeamId] = React.useState(teams[0]?.id ?? "")
  const [doc, setDoc] = React.useState<Value>(EMPTY_DOC)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await createIssueAction({
        workspaceId,
        workspaceSlug,
        teamId,
        title,
        descriptionDoc: doc,
      })
      if ("error" in result) {
        setError(result.error)
        return
      }
      router.push(`/w/${workspaceSlug}/issues/${result.id}`)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="issue-title">Title</Label>
        <Input
          id="issue-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Issue title"
          required
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label>Team</Label>
        {teams.length ? (
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.key} · {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Create a team before filing issues.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <RichTextEditor
          workspaceId={workspaceId}
          mentionables={mentionables}
          value={EMPTY_DOC}
          onChange={setDoc}
          variant="default"
          placeholder="Describe the issue. Type / for commands, @ to mention…"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !teams.length}>
          {pending ? "Creating…" : "Create issue"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => router.push(`/w/${workspaceSlug}/issues`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
