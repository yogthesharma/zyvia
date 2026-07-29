"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { Value } from "platejs"
import { toast } from "sonner"

import { SettingsSubpage } from "@/components/app/settings-page"
import { RichTextEditor } from "@/components/rich-editor"
import { Button } from "@/components/ui/button"
import { Icon, IconPicker, type IconName } from "@/components/ui/icon-picker"
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  updateDocumentTemplate,
} from "@/lib/documents/actions"
import {
  DEFAULT_DOCUMENT_TEMPLATE_ICON,
  MAX_DOCUMENT_TEMPLATE_NAME_LENGTH,
  documentTemplateInputsEqual,
  normalizeDocumentTemplateName,
} from "@/lib/documents/schema"
import type { DocumentTemplate } from "@/lib/documents/types"
import { EMPTY_DOC } from "@/lib/rich-editor/schema"
import type { RichMentionable } from "@/lib/rich-editor/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "document-template-form"

export function DocumentTemplateForm({
  workspaceId,
  workspaceSlug,
  canEdit,
  mentionables,
  template,
}: {
  workspaceId: string
  workspaceSlug: string
  canEdit: boolean
  mentionables: RichMentionable[]
  template?: DocumentTemplate
}) {
  const router = useRouter()
  const isEdit = Boolean(template)
  const backHref = `/w/${workspaceSlug}/settings/documents`

  const [name, setName] = React.useState(template?.name ?? "")
  const [icon, setIcon] = React.useState<IconName>(
    (template?.icon as IconName) ??
      (DEFAULT_DOCUMENT_TEMPLATE_ICON as IconName)
  )
  const [doc, setDoc] = React.useState<Value>(template?.bodyDoc ?? EMPTY_DOC)
  const [pending, setPending] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || !canEdit) return

    const nextName = normalizeDocumentTemplateName(name)
    if (!nextName) {
      toast.error("Template name is required.", { id: TOAST_ID })
      return
    }
    if (nextName.length > MAX_DOCUMENT_TEMPLATE_NAME_LENGTH) {
      toast.error("Template name is too long.", { id: TOAST_ID })
      return
    }

    const payload = {
      name: nextName,
      icon,
      bodyDoc: doc,
      teamId: null as string | null,
    }

    if (
      isEdit &&
      template &&
      documentTemplateInputsEqual(payload, {
        name: template.name,
        icon: template.icon,
        bodyDoc: template.bodyDoc,
        teamId: template.teamId,
      })
    ) {
      window.location.assign(backHref)
      return
    }

    setPending(true)
    try {
      const result = isEdit
        ? await updateDocumentTemplate(workspaceSlug, template!.id, payload)
        : await createDocumentTemplate(workspaceSlug, payload)

      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      toast.success(isEdit ? "Template updated" : "Template created", {
        id: TOAST_ID,
      })
      window.location.assign(result.redirectTo ?? backHref)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEdit
            ? "Could not update template."
            : "Could not create template.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(false)
    }
  }

  async function onDelete() {
    if (!template || deleting || !canEdit) return
    const confirmed = window.confirm(
      `Delete “${template.name}”? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const result = await deleteDocumentTemplate(workspaceSlug, template.id)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      toast.success("Template deleted", { id: TOAST_ID })
      window.location.assign(result.redirectTo ?? backHref)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete template.",
        { id: TOAST_ID }
      )
    } finally {
      setDeleting(false)
    }
  }

  const busy = pending || deleting
  const canSubmit = canEdit && name.trim().length > 0 && !busy

  return (
    <SettingsSubpage backHref={backHref} backLabel="Documents">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-3xl space-y-6 px-8 pt-12 pb-8"
      >
        <header className="space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">
            {isEdit ? "Edit document template" : "New document template"}
          </h1>

          <div className="space-y-3">
            <IconPicker
              value={icon}
              onValueChange={(next) => setIcon(next)}
              searchable
              categorized
              modal
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-foreground"
                aria-label="Choose template icon"
                disabled={!canEdit || busy}
              >
                <Icon name={icon} className="size-5" />
              </Button>
            </IconPicker>

            <input
              type="text"
              value={name}
              disabled={!canEdit || busy}
              maxLength={MAX_DOCUMENT_TEMPLATE_NAME_LENGTH}
              placeholder="Template name"
              aria-label="Template name"
              autoFocus
              className={cn(
                "w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50",
                (!canEdit || busy) && "opacity-50"
              )}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </header>

        <div
          className={cn(
            "min-h-64 overflow-hidden rounded-xl bg-muted/40 px-3 py-2",
            (!canEdit || busy) && "opacity-50"
          )}
        >
          <RichTextEditor
            workspaceId={workspaceId}
            mentionables={mentionables}
            value={doc}
            onChange={setDoc}
            readOnly={!canEdit || busy}
            variant="compact"
            placeholder="Click here to start writing…"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          {isEdit && canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-destructive hover:text-destructive"
              onClick={() => void onDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => router.push(backHref)}
            >
              Cancel
            </Button>
            {canEdit ? (
              <Button type="submit" size="sm" disabled={!canSubmit}>
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
        </div>
      </form>
    </SettingsSubpage>
  )
}
