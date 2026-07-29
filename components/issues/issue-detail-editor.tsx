"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { Value } from "platejs"

import { RichTextEditor } from "@/components/rich-editor"
import { RichTextViewer } from "@/components/rich-editor/rich-text-viewer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateIssueAction } from "@/lib/issues/actions"
import { parseRichDoc } from "@/lib/rich-editor/schema"
import type { RichDoc, RichMentionable } from "@/lib/rich-editor/types"

export function IssueDetailEditor({
  issueId,
  workspaceId,
  workspaceSlug,
  initialTitle,
  initialDescriptionDoc,
  mentionables,
}: {
  issueId: string
  workspaceId: string
  workspaceSlug: string
  initialTitle: string
  initialDescriptionDoc: unknown
  mentionables: RichMentionable[]
}) {
  const router = useRouter()
  const initialDoc = React.useMemo(
    () => parseRichDoc(initialDescriptionDoc),
    [initialDescriptionDoc]
  )
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState(initialTitle)
  const [doc, setDoc] = React.useState<Value>(initialDoc)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setTitle(initialTitle)
    setDoc(initialDoc)
  }, [initialTitle, initialDoc])

  const onSave = async () => {
    setError(null)
    setPending(true)
    try {
      const result = await updateIssueAction({
        id: issueId,
        workspaceSlug,
        title,
        descriptionDoc: doc as RichDoc,
      })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const onCancel = () => {
    setTitle(initialTitle)
    setDoc(initialDoc)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {initialTitle}
          </h1>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
        <RichTextViewer value={initialDescriptionDoc} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-issue-title">Title</Label>
        <Input
          id="edit-issue-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Description</Label>
        <RichTextEditor
          key={`${issueId}-edit`}
          workspaceId={workspaceId}
          mentionables={mentionables}
          value={initialDoc}
          onChange={setDoc}
          variant="default"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
