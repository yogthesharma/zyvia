export type EmailNotificationFormat = "digest" | "individual"

export type EmailNotificationSettings = {
  enabled: boolean
  format: EmailNotificationFormat
  delayOutsideWorkHours: boolean
  urgentImmediate: boolean
  assignments: boolean
  statusChanges: boolean
  comments: boolean
  mentions: boolean
  reactions: boolean
  subscriptions: boolean
  documentChanges: boolean
  updates: boolean
  reminders: boolean
  appsIntegrations: boolean
  billing: boolean
  customerRequests: boolean
  triage: boolean
  changelogNewsletter: boolean
  marketing: boolean
  inviteAccepted: boolean
  privacyLegal: boolean
}

export type EmailNotificationSettingsUpdate = Partial<EmailNotificationSettings>

export type EmailNotificationSettingsRow = {
  user_id: string
  enabled: boolean
  format: EmailNotificationFormat
  delay_outside_work_hours: boolean
  urgent_immediate: boolean
  assignments: boolean
  status_changes: boolean
  comments: boolean
  mentions: boolean
  reactions: boolean
  subscriptions: boolean
  document_changes: boolean
  updates: boolean
  reminders: boolean
  apps_integrations: boolean
  billing: boolean
  customer_requests: boolean
  triage: boolean
  changelog_newsletter: boolean
  marketing: boolean
  invite_accepted: boolean
  privacy_legal: boolean
}

export type NotificationActionResult = {
  error?: string
  settings?: EmailNotificationSettings
}
