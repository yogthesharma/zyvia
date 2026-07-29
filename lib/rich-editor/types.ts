import type { Value } from "platejs"

/** Plate document value stored in jsonb (e.g. issues.description_doc). */
export type RichDoc = Value

export type RichMentionable = {
  key: string
  text: string
  avatarUrl?: string | null
}

export type UploadEditorMediaResult =
  | {
      url: string
      name: string
      size: number
      type: string
      key: string
    }
  | { error: string }
