import { z } from "zod"

import type { RichDoc } from "@/lib/rich-editor/types"

/** Empty paragraph doc used for new issues / cleared editors. */
export const EMPTY_DOC: RichDoc = [
  { type: "p", children: [{ text: "" }] },
]

const plateNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z
      .object({
        text: z.string(),
      })
      .passthrough(),
    z
      .object({
        type: z.string().optional(),
        children: z.array(plateNodeSchema),
      })
      .passthrough(),
  ])
)

const richDocSchema = z.array(plateNodeSchema).min(1)

/** Normalize unknown JSON into a Plate Value; fall back to EMPTY_DOC. */
export function parseRichDoc(input: unknown): RichDoc {
  const parsed = richDocSchema.safeParse(input)
  if (!parsed.success) return EMPTY_DOC
  return parsed.data as RichDoc
}

/** Parse a JSON string or already-parsed value into a RichDoc. */
export function parseRichDocInput(input: unknown): RichDoc {
  if (typeof input === "string") {
    try {
      return parseRichDoc(JSON.parse(input))
    } catch {
      return EMPTY_DOC
    }
  }
  return parseRichDoc(input)
}

export function isEmptyRichDoc(doc: RichDoc): boolean {
  if (doc.length === 0) return true
  if (doc.length > 1) return false
  const only = doc[0] as { type?: string; children?: unknown[] }
  if (only?.type && only.type !== "p") return false
  const children = only?.children
  if (!Array.isArray(children) || children.length === 0) return true
  if (children.length > 1) return false
  const leaf = children[0] as { text?: string }
  return typeof leaf?.text === "string" && leaf.text.trim() === ""
}
