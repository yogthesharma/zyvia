import {
  EMPTY_DOC,
  isEmptyRichDoc,
  parseRichDocInput,
} from "@/lib/rich-editor/schema"
import { richDocToPlainText } from "@/lib/rich-editor/plain-text"
import type { RichDoc } from "@/lib/rich-editor/types"
import type { DocumentTemplateInput } from "@/lib/documents/types"

export const DEFAULT_DOCUMENT_TEMPLATE_ICON = "file-text"
export const MAX_DOCUMENT_TEMPLATE_NAME_LENGTH = 120
export const MAX_DOCUMENT_TEMPLATE_BODY_TEXT_LENGTH = 100_000

const ICON_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isDocumentTemplateId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function normalizeDocumentTemplateName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function parseDocumentTemplateIcon(
  icon: unknown
): { icon?: string; error?: string } {
  if (icon == null || icon === "") {
    return { icon: DEFAULT_DOCUMENT_TEMPLATE_ICON }
  }
  if (typeof icon !== "string") return { error: "Invalid icon." }
  const trimmed = icon.trim()
  if (!trimmed) return { icon: DEFAULT_DOCUMENT_TEMPLATE_ICON }
  if (trimmed.length > 64 || !ICON_NAME_RE.test(trimmed)) {
    return { error: "Invalid icon." }
  }
  return { icon: trimmed }
}

export function parseDocumentTemplateBody(input: unknown): {
  bodyDoc?: RichDoc
  bodyText?: string
  error?: string
} {
  const bodyDoc = parseRichDocInput(input ?? EMPTY_DOC)
  if (isEmptyRichDoc(bodyDoc)) {
    return { bodyDoc: EMPTY_DOC, bodyText: "" }
  }
  const bodyText = richDocToPlainText(bodyDoc)
  if (bodyText.length > MAX_DOCUMENT_TEMPLATE_BODY_TEXT_LENGTH) {
    return { error: "Template body is too long." }
  }
  return { bodyDoc, bodyText }
}

export function parseDocumentTemplateInput(
  input: unknown
): { data?: DocumentTemplateInput; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid template payload." }
  }

  const raw = input as Record<string, unknown>
  if (typeof raw.name !== "string") {
    return { error: "Template name is required." }
  }

  const name = normalizeDocumentTemplateName(raw.name)
  if (!name) return { error: "Template name is required." }
  if (name.length > MAX_DOCUMENT_TEMPLATE_NAME_LENGTH) {
    return { error: "Template name is too long." }
  }

  const iconResult = parseDocumentTemplateIcon(raw.icon)
  if (iconResult.error || !iconResult.icon) {
    return { error: iconResult.error ?? "Invalid icon." }
  }

  const bodyResult = parseDocumentTemplateBody(raw.bodyDoc)
  if (bodyResult.error || !bodyResult.bodyDoc) {
    return { error: bodyResult.error ?? "Invalid template body." }
  }

  let teamId: string | null = null
  if ("teamId" in raw && raw.teamId != null && raw.teamId !== "") {
    if (typeof raw.teamId !== "string" || !UUID_RE.test(raw.teamId)) {
      return { error: "Invalid team." }
    }
    teamId = raw.teamId
  }

  return {
    data: {
      name,
      icon: iconResult.icon,
      bodyDoc: bodyResult.bodyDoc,
      teamId,
    },
  }
}

/** Compare templates for no-op updates (avoids bumping updated_at). */
export function documentTemplateInputsEqual(
  a: DocumentTemplateInput,
  b: {
    name: string
    icon: string
    bodyDoc: RichDoc
    teamId?: string | null
  }
) {
  const aTeam = a.teamId ?? null
  const bTeam = b.teamId ?? null
  if (a.name !== b.name || a.icon !== b.icon || aTeam !== bTeam) return false
  return JSON.stringify(a.bodyDoc) === JSON.stringify(b.bodyDoc)
}
