import { createSlateEditor } from "platejs"

import { BaseBasicBlocksKit } from "@/components/editor/plugins/basic-blocks-base-kit"
import { BaseBasicMarksKit } from "@/components/editor/plugins/basic-marks-base-kit"
import { BaseListKit } from "@/components/editor/plugins/list-base-kit"
import { BaseMediaKit } from "@/components/editor/plugins/media-base-kit"
import { BaseMentionKit } from "@/components/editor/plugins/mention-base-kit"
import { BaseTableKit } from "@/components/editor/plugins/table-base-kit"
import { EditorStatic } from "@/components/ui/editor-static"
import { EMPTY_DOC, parseRichDoc } from "@/lib/rich-editor/schema"
import type { RichDoc } from "@/lib/rich-editor/types"
import { cn } from "@/lib/utils"

const VIEWER_PLUGINS = [
  ...BaseBasicBlocksKit,
  ...BaseBasicMarksKit,
  ...BaseListKit,
  ...BaseTableKit,
  ...BaseMediaKit,
  ...BaseMentionKit,
]

export type RichTextViewerProps = {
  className?: string
  value?: RichDoc | unknown | null
  emptyLabel?: string
}

export function RichTextViewer({
  className,
  value,
  emptyLabel = "No description",
}: RichTextViewerProps) {
  const doc = value == null ? EMPTY_DOC : parseRichDoc(value)
  const isEmpty =
    doc.length === 1 &&
    (doc[0] as { type?: string; children?: { text?: string }[] })?.type ===
      "p" &&
    ((doc[0] as { children?: { text?: string }[] }).children?.length ?? 0) <=
      1 &&
    !(doc[0] as { children?: { text?: string }[] }).children?.[0]?.text?.trim()

  if (isEmpty) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {emptyLabel}
      </p>
    )
  }

  const editor = createSlateEditor({
    plugins: VIEWER_PLUGINS,
    value: doc,
  })

  return (
    <div className={cn("text-sm", className)}>
      <EditorStatic editor={editor} variant="none" className="px-0 py-0" />
    </div>
  )
}
