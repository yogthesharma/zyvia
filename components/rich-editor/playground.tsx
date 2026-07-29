"use client"

import * as React from "react"
import type { Value } from "platejs"

import { RichTextEditor } from "@/components/rich-editor/rich-text-editor"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "zyvia-rich-editor-playground-v2"

export function RichEditorPlayground() {
  const [value, setValue] = React.useState<Value | null>(null)
  const [showJson, setShowJson] = React.useState(false)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Isolated playground · easy to remove
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Rich editor</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Full demo doc below — headings, marks, quotes, lists, table, mentions,
          image/video/audio/file, and embeds. Type{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/</code> for
          slash commands or select text for the bubble menu. Hit Reset to
          reload the showcase.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowJson((v) => !v)}
        >
          {showJson ? "Hide JSON" : "Show JSON"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            window.localStorage.removeItem(STORAGE_KEY)
            window.location.reload()
          }}
        >
          Reset
        </Button>
      </div>

      <RichTextEditor
        storageKey={STORAGE_KEY}
        onChange={setValue}
      />

      {showJson ? (
        <pre className="max-h-80 overflow-auto rounded-xl bg-muted/40 p-4 text-xs leading-relaxed">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}
