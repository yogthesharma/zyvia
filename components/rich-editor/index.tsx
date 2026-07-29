"use client"

import dynamic from "next/dynamic"

import type { RichTextEditorProps } from "@/components/rich-editor/rich-text-editor"

export type { RichTextEditorProps }

/** Code-split Plate so it stays off routes that only show the viewer. */
export const RichTextEditorLazy = dynamic(
  () =>
    import("@/components/rich-editor/rich-text-editor").then(
      (mod) => mod.RichTextEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[160px] animate-pulse rounded-xl border border-border bg-muted/20" />
    ),
  }
)

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorLazy {...props} />
}
