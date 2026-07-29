"use client"

import { useEffect, useState } from "react"
import type { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"

import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit"
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit"
import { ListKit } from "@/components/editor/plugins/list-kit"
import { MediaKit } from "@/components/editor/plugins/media-kit"
import { MentionKit } from "@/components/editor/plugins/mention-kit"
import { SlashKit } from "@/components/editor/plugins/slash-kit"
import { TableKit } from "@/components/editor/plugins/table-kit"
import { MediaUploadDialogKit } from "@/components/editor/media-upload-dialog"
import { RICH_EDITOR_DEMO_VALUE } from "@/components/rich-editor/demo-value"
import { Editor, EditorContainer } from "@/components/ui/editor"
import { cn } from "@/lib/utils"

export type RichTextEditorProps = {
  className?: string
  initialValue?: Value
  onChange?: (value: Value) => void
  placeholder?: string
  readOnly?: boolean
  /** Persist key for localStorage playground saves. Pass null to disable. */
  storageKey?: string | null
}

const DEFAULT_VALUE = RICH_EDITOR_DEMO_VALUE

const PLAYGROUND_PLUGINS = [
  ...BasicNodesKit,
  ...ListKit,
  ...TableKit,
  ...MediaKit,
  ...MentionKit,
  ...SlashKit,
  ...FloatingToolbarKit,
  ...MediaUploadDialogKit,
]

function readStoredValue(storageKey: string | null): Value | null {
  if (!storageKey || typeof window === "undefined") return null
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
  initialValue,
  onChange,
  placeholder,
  readOnly,
  storageKey,
}: Required<
  Pick<RichTextEditorProps, "placeholder" | "readOnly">
> &
  Omit<RichTextEditorProps, "placeholder" | "readOnly">) {
  const editor = usePlateEditor({
    plugins: PLAYGROUND_PLUGINS,
    value: initialValue ?? DEFAULT_VALUE,
  })

  useEffect(() => {
    onChange?.(editor.children as Value)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount sync
  }, [])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-muted/20 shadow-sm",
        className
      )}
    >
      <Plate
        editor={editor}
        readOnly={readOnly}
        onChange={({ value }) => {
          onChange?.(value)
          if (storageKey && typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, JSON.stringify(value))
          }
        }}
      >
        <EditorContainer className="min-h-[720px] max-h-[80vh]">
          <Editor
            placeholder={placeholder}
            variant="none"
            className="px-8 py-6"
          />
        </EditorContainer>
      </Plate>
    </div>
  )
}

export function RichTextEditor({
  className,
  initialValue,
  onChange,
  placeholder = "Type / for commands, @ to mention…",
  readOnly = false,
  storageKey = null,
}: RichTextEditorProps) {
  const [ready, setReady] = useState(storageKey === null)
  const [resolvedValue, setResolvedValue] = useState<Value | undefined>(
    initialValue
  )

  useEffect(() => {
    if (storageKey === null) return
    setResolvedValue(readStoredValue(storageKey) ?? initialValue ?? DEFAULT_VALUE)
    setReady(true)
  }, [initialValue, storageKey])

  if (!ready) {
    return (
      <div
        className={cn(
          "min-h-[420px] rounded-xl bg-muted/20 shadow-sm",
          className
        )}
      />
    )
  }

  return (
    <RichTextEditorInner
      key={storageKey ?? "editor"}
      className={className}
      initialValue={resolvedValue}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      storageKey={storageKey}
    />
  )
}
