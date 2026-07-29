"use client"

import { useEffect, useState } from "react"
import type { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"

import { MediaUploadDialogKit } from "@/components/editor/media-upload-dialog"
import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit"
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit"
import { ListKit } from "@/components/editor/plugins/list-kit"
import { MediaKit } from "@/components/editor/plugins/media-kit"
import { MentionKit } from "@/components/editor/plugins/mention-kit"
import { SlashKit } from "@/components/editor/plugins/slash-kit"
import { TableKit } from "@/components/editor/plugins/table-kit"
import {
  EditorWorkspaceProvider,
  MentionablesProvider,
} from "@/components/rich-editor/editor-context"
import { Editor, EditorContainer } from "@/components/ui/editor"
import { EMPTY_DOC } from "@/lib/rich-editor/schema"
import type { RichMentionable } from "@/lib/rich-editor/types"
import { cn } from "@/lib/utils"

export type RichTextEditorProps = {
  className?: string
  /** Initial Plate value (uncontrolled after mount; remount with key to reset). */
  value?: Value
  onChange?: (value: Value) => void
  placeholder?: string
  readOnly?: boolean
  mentionables?: RichMentionable[]
  /** When set, media uploads go to Supabase editor-media for this workspace. */
  workspaceId?: string | null
  variant?: "default" | "compact" | "playground"
  /**
   * Playground-only localStorage key. Omit / null for product surfaces.
   */
  storageKey?: string | null
}

const PRODUCT_PLUGINS = [
  ...BasicNodesKit,
  ...ListKit,
  ...TableKit,
  ...MediaKit,
  ...MentionKit,
  ...SlashKit,
  ...FloatingToolbarKit,
  ...MediaUploadDialogKit,
]

const VARIANT_CONTAINER: Record<
  NonNullable<RichTextEditorProps["variant"]>,
  string
> = {
  default: "min-h-[280px] max-h-[min(70vh,640px)]",
  compact: "min-h-[160px] max-h-[360px]",
  playground: "min-h-[720px] max-h-[80vh]",
}

function readStoredValue(storageKey: string): Value | null {
  if (typeof window === "undefined") return null
  const saved = window.localStorage.getItem(storageKey)
  if (!saved) return null
  try {
    return JSON.parse(saved) as Value
  } catch {
    return null
  }
}

function RichTextEditorInner({
  className,
  value,
  onChange,
  placeholder,
  readOnly,
  variant,
  storageKey,
}: {
  className?: string
  value: Value
  onChange?: (value: Value) => void
  placeholder: string
  readOnly: boolean
  variant: NonNullable<RichTextEditorProps["variant"]>
  storageKey?: string | null
}) {
  const editor = usePlateEditor({
    plugins: PRODUCT_PLUGINS,
    value,
  })

  useEffect(() => {
    onChange?.(editor.children as Value)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync only
  }, [])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background",
        className
      )}
    >
      <Plate
        editor={editor}
        readOnly={readOnly}
        onChange={({ value: next }) => {
          onChange?.(next)
          if (storageKey && typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, JSON.stringify(next))
          }
        }}
      >
        <EditorContainer className={VARIANT_CONTAINER[variant]}>
          <Editor
            placeholder={placeholder}
            variant="none"
            className={cn(
              variant === "playground" ? "px-8 py-6" : "px-4 py-3 text-sm"
            )}
          />
        </EditorContainer>
      </Plate>
    </div>
  )
}

export function RichTextEditor({
  className,
  value,
  onChange,
  placeholder = "Type / for commands, @ to mention…",
  readOnly = false,
  mentionables,
  workspaceId = null,
  variant = "default",
  storageKey = null,
}: RichTextEditorProps) {
  const [ready, setReady] = useState(storageKey === null)
  const [resolvedValue, setResolvedValue] = useState<Value>(
    value ?? EMPTY_DOC
  )

  useEffect(() => {
    if (storageKey === null) {
      setResolvedValue(value ?? EMPTY_DOC)
      setReady(true)
      return
    }
    setResolvedValue(readStoredValue(storageKey) ?? value ?? EMPTY_DOC)
    setReady(true)
  }, [storageKey, value])

  if (!ready) {
    return (
      <div
        className={cn(
          "min-h-[160px] rounded-xl border border-border bg-muted/20",
          className
        )}
      />
    )
  }

  return (
    <EditorWorkspaceProvider workspaceId={workspaceId}>
      <MentionablesProvider mentionables={mentionables}>
        <RichTextEditorInner
          key={storageKey ?? "editor"}
          className={className}
          value={resolvedValue}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          variant={variant}
          storageKey={storageKey}
        />
      </MentionablesProvider>
    </EditorWorkspaceProvider>
  )
}
