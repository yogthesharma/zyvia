import type {
  EmailNotificationFormat,
  EmailNotificationSettings,
  EmailNotificationSettingsUpdate,
} from "@/lib/notifications/types"

export const EMAIL_NOTIFICATION_FORMATS = new Set<EmailNotificationFormat>([
  "digest",
  "individual",
])

/** Activity categories gated by the master `enabled` switch. */
export const ACTIVITY_TOGGLE_KEYS = [
  "delayOutsideWorkHours",
  "urgentImmediate",
  "assignments",
  "statusChanges",
  "comments",
  "mentions",
  "reactions",
  "subscriptions",
  "documentChanges",
  "updates",
  "reminders",
  "appsIntegrations",
  "billing",
  "customerRequests",
  "triage",
] as const

/** Account/product emails that can stay on when activity email is disabled. */
export const PRODUCT_TOGGLE_KEYS = [
  "changelogNewsletter",
  "marketing",
  "inviteAccepted",
  "privacyLegal",
] as const

const BOOLEAN_KEYS = [
  "enabled",
  ...ACTIVITY_TOGGLE_KEYS,
  ...PRODUCT_TOGGLE_KEYS,
] as const

type BooleanKey = (typeof BOOLEAN_KEYS)[number]

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

export function parseEmailNotificationUpdate(
  input: unknown
): { data?: EmailNotificationSettingsUpdate; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Invalid notification settings payload." }
  }

  const raw = input as Record<string, unknown>
  const data: EmailNotificationSettingsUpdate = {}

  if ("format" in raw) {
    if (
      typeof raw.format !== "string" ||
      !EMAIL_NOTIFICATION_FORMATS.has(raw.format as EmailNotificationFormat)
    ) {
      return { error: "Invalid notification format." }
    }
    data.format = raw.format as EmailNotificationFormat
  }

  for (const key of BOOLEAN_KEYS) {
    if (key in raw) {
      if (!isBoolean(raw[key])) {
        return { error: `Invalid value for ${key}.` }
      }
      data[key as BooleanKey] = raw[key] as boolean
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: "No notification changes provided." }
  }

  return { data }
}

export type EmailNotificationCategory = Exclude<
  keyof EmailNotificationSettings,
  "enabled" | "format" | "delayOutsideWorkHours" | "urgentImmediate"
>

const PRODUCT_CATEGORY_SET = new Set<string>(PRODUCT_TOGGLE_KEYS)

/**
 * Whether an outbound email for this category should be sent.
 * Product/account emails can still send when activity email is disabled.
 */
export function shouldSendEmailNotification(
  settings: EmailNotificationSettings,
  category: EmailNotificationCategory
): boolean {
  if (!settings[category]) return false
  if (PRODUCT_CATEGORY_SET.has(category)) return true
  return settings.enabled
}
