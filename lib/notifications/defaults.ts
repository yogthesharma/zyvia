import type {
  EmailNotificationFormat,
  EmailNotificationSettings,
  EmailNotificationSettingsRow,
  EmailNotificationSettingsUpdate,
} from "@/lib/notifications/types"

export const DEFAULT_EMAIL_NOTIFICATION_SETTINGS: EmailNotificationSettings = {
  enabled: true,
  format: "digest",
  delayOutsideWorkHours: true,
  urgentImmediate: true,
  assignments: true,
  statusChanges: true,
  comments: true,
  mentions: true,
  reactions: true,
  subscriptions: true,
  documentChanges: true,
  updates: true,
  reminders: true,
  appsIntegrations: true,
  billing: true,
  customerRequests: true,
  triage: true,
  changelogNewsletter: false,
  marketing: true,
  inviteAccepted: true,
  privacyLegal: true,
}

export const EMAIL_NOTIFICATION_SELECT =
  "enabled, format, delay_outside_work_hours, urgent_immediate, assignments, status_changes, comments, mentions, reactions, subscriptions, document_changes, updates, reminders, apps_integrations, billing, customer_requests, triage, changelog_newsletter, marketing, invite_accepted, privacy_legal" as const

function bool(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean" ? value : fallback
}

function formatValue(value: unknown): EmailNotificationFormat {
  return value === "individual" || value === "digest" ? value : "digest"
}

export function mapEmailNotificationRow(
  row: EmailNotificationSettingsRow | null | undefined
): EmailNotificationSettings {
  const d = DEFAULT_EMAIL_NOTIFICATION_SETTINGS
  return {
    enabled: bool(row?.enabled, d.enabled),
    format: formatValue(row?.format),
    delayOutsideWorkHours: bool(
      row?.delay_outside_work_hours,
      d.delayOutsideWorkHours
    ),
    urgentImmediate: bool(row?.urgent_immediate, d.urgentImmediate),
    assignments: bool(row?.assignments, d.assignments),
    statusChanges: bool(row?.status_changes, d.statusChanges),
    comments: bool(row?.comments, d.comments),
    mentions: bool(row?.mentions, d.mentions),
    reactions: bool(row?.reactions, d.reactions),
    subscriptions: bool(row?.subscriptions, d.subscriptions),
    documentChanges: bool(row?.document_changes, d.documentChanges),
    updates: bool(row?.updates, d.updates),
    reminders: bool(row?.reminders, d.reminders),
    appsIntegrations: bool(row?.apps_integrations, d.appsIntegrations),
    billing: bool(row?.billing, d.billing),
    customerRequests: bool(row?.customer_requests, d.customerRequests),
    triage: bool(row?.triage, d.triage),
    changelogNewsletter: bool(
      row?.changelog_newsletter,
      d.changelogNewsletter
    ),
    marketing: bool(row?.marketing, d.marketing),
    inviteAccepted: bool(row?.invite_accepted, d.inviteAccepted),
    privacyLegal: bool(row?.privacy_legal, d.privacyLegal),
  }
}

export function toEmailNotificationPatch(
  update: EmailNotificationSettingsUpdate
) {
  const patch: Record<string, unknown> = {}

  if (update.enabled !== undefined) patch.enabled = update.enabled
  if (update.format !== undefined) patch.format = update.format
  if (update.delayOutsideWorkHours !== undefined) {
    patch.delay_outside_work_hours = update.delayOutsideWorkHours
  }
  if (update.urgentImmediate !== undefined) {
    patch.urgent_immediate = update.urgentImmediate
  }
  if (update.assignments !== undefined) patch.assignments = update.assignments
  if (update.statusChanges !== undefined) {
    patch.status_changes = update.statusChanges
  }
  if (update.comments !== undefined) patch.comments = update.comments
  if (update.mentions !== undefined) patch.mentions = update.mentions
  if (update.reactions !== undefined) patch.reactions = update.reactions
  if (update.subscriptions !== undefined) {
    patch.subscriptions = update.subscriptions
  }
  if (update.documentChanges !== undefined) {
    patch.document_changes = update.documentChanges
  }
  if (update.updates !== undefined) patch.updates = update.updates
  if (update.reminders !== undefined) patch.reminders = update.reminders
  if (update.appsIntegrations !== undefined) {
    patch.apps_integrations = update.appsIntegrations
  }
  if (update.billing !== undefined) patch.billing = update.billing
  if (update.customerRequests !== undefined) {
    patch.customer_requests = update.customerRequests
  }
  if (update.triage !== undefined) patch.triage = update.triage
  if (update.changelogNewsletter !== undefined) {
    patch.changelog_newsletter = update.changelogNewsletter
  }
  if (update.marketing !== undefined) patch.marketing = update.marketing
  if (update.inviteAccepted !== undefined) {
    patch.invite_accepted = update.inviteAccepted
  }
  if (update.privacyLegal !== undefined) {
    patch.privacy_legal = update.privacyLegal
  }

  return patch
}
