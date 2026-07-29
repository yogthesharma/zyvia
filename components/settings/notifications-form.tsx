"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/app/settings-page"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { updateEmailNotificationSettings } from "@/lib/notifications/actions"
import { EMAIL_NOTIFICATION_FORMATS } from "@/lib/notifications/schema"
import type {
  EmailNotificationFormat,
  EmailNotificationSettings,
  EmailNotificationSettingsUpdate,
} from "@/lib/notifications/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "notifications-save"

type ToggleKey = Exclude<keyof EmailNotificationSettings, "format">

const GENERAL_TOGGLES: {
  key: ToggleKey
  label: string
  description: string
}[] = [
  {
    key: "assignments",
    label: "Assignments",
    description: "Assignments, unassignments, and membership changes.",
  },
  {
    key: "statusChanges",
    label: "Status changes",
    description:
      "Changes to the status, priority, and blocking relationships of issues.",
  },
  {
    key: "comments",
    label: "Comments and replies",
    description: "Comments, replies, and thread resolutions.",
  },
  {
    key: "mentions",
    label: "Mentions",
    description: "Mentions in comments or content.",
  },
  {
    key: "reactions",
    label: "Reactions",
    description: "Emoji reactions to your content.",
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    description:
      "Issues, projects, initiatives, teams, and views you’re subscribed to.",
  },
  {
    key: "documentChanges",
    label: "Document changes",
    description: "Changes to document content, location, and subscriptions.",
  },
  {
    key: "updates",
    label: "Updates",
    description:
      "New project & initiative updates and reminders to post an update.",
  },
  {
    key: "reminders",
    label: "Reminders and deadlines",
    description: "Reminders, due dates, and SLA updates.",
  },
  {
    key: "appsIntegrations",
    label: "Apps and integrations",
    description: "Requests related to OAuth apps and integrations.",
  },
  {
    key: "billing",
    label: "Billing",
    description: "Usage credit balance alerts.",
  },
]

const FEATURE_TOGGLES: {
  key: ToggleKey
  label: string
  description: string
}[] = [
  {
    key: "customerRequests",
    label: "Customer requests",
    description: "Requests from your customers.",
  },
  {
    key: "triage",
    label: "Triage",
    description: "Issues added to triage.",
  },
]

const PRODUCT_TOGGLES: {
  key: ToggleKey
  label: string
  description: string
}[] = [
  {
    key: "changelogNewsletter",
    label: "Changelog newsletter",
    description:
      "Receive an email twice a month highlighting new features and improvements.",
  },
  {
    key: "marketing",
    label: "Marketing and onboarding",
    description: "Occasional updates to help you get the most out of Zyvia.",
  },
  {
    key: "inviteAccepted",
    label: "Invite accepted",
    description: "Email when invitees accept an invite.",
  },
  {
    key: "privacyLegal",
    label: "Privacy and legal updates",
    description: "Email when privacy policies or terms of service change.",
  },
]

function ToggleRows({
  items,
  settings,
  disabled,
  isPending,
  onToggle,
}: {
  items: { key: ToggleKey; label: string; description: string }[]
  settings: EmailNotificationSettings
  disabled: boolean
  isPending: (key: string) => boolean
  onToggle: (key: ToggleKey, checked: boolean) => void
}) {
  return (
    <>
      {items.map((item) => (
        <SettingsRow
          key={item.key}
          label={item.label}
          description={item.description}
          control={
            <Switch
              checked={Boolean(settings[item.key])}
              disabled={disabled || isPending(item.key)}
              onCheckedChange={(checked) => onToggle(item.key, checked)}
            />
          }
        />
      ))}
    </>
  )
}

export function NotificationsForm({
  initialSettings,
  email,
}: {
  initialSettings: EmailNotificationSettings
  email: string
}) {
  const [settings, setSettings] =
    React.useState<EmailNotificationSettings>(initialSettings)
  const settingsRef = React.useRef(settings)
  const requestIdsRef = React.useRef<Record<string, number>>({})
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    setSettings(initialSettings)
    settingsRef.current = initialSettings
  }, [initialSettings])

  React.useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  function setKeyPending(key: string, pending: boolean) {
    setPendingKeys((prev) => {
      const next = new Set(prev)
      if (pending) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const isPending = (key: string) => pendingKeys.has(key)
  const hasEmail = Boolean(email.trim())
  const emailEnabled = settings.enabled
  const showDigestOptions = settings.format === "digest"

  async function patch(
    update: EmailNotificationSettingsUpdate,
    key: string
  ) {
    const [field, value] = Object.entries(update)[0] ?? []
    if (
      field &&
      settingsRef.current[field as keyof EmailNotificationSettings] === value
    ) {
      return
    }

    if (update.enabled === true && !hasEmail) {
      toast.error(
        "Add an email address in Profile before enabling email notifications.",
        { id: TOAST_ID }
      )
      return
    }

    const requestId = (requestIdsRef.current[key] ?? 0) + 1
    requestIdsRef.current[key] = requestId
    const previous = settingsRef.current
    const next = { ...previous, ...update }
    const updatedKeys = Object.keys(
      update
    ) as (keyof EmailNotificationSettings)[]

    settingsRef.current = next
    setSettings(next)
    setKeyPending(key, true)

    try {
      const result = await updateEmailNotificationSettings(update)
      if (requestIdsRef.current[key] !== requestId) return

      if (result.error) {
        setSettings((prev) => {
          const rolled = { ...prev }
          for (const k of updatedKeys) {
            rolled[k] = previous[k] as never
          }
          settingsRef.current = rolled
          return rolled
        })
        toast.error(result.error, { id: TOAST_ID })
        return
      }

      if (result.settings) {
        setSettings((prev) => {
          const merged = { ...prev }
          for (const k of updatedKeys) {
            merged[k] = result.settings![k] as never
          }
          settingsRef.current = merged
          return merged
        })
      }

      toast.success("Notification settings saved", { id: TOAST_ID })
    } catch (error) {
      if (requestIdsRef.current[key] !== requestId) return
      setSettings((prev) => {
        const rolled = { ...prev }
        for (const k of updatedKeys) {
          rolled[k] = previous[k] as never
        }
        settingsRef.current = rolled
        return rolled
      })
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save notification settings.",
        { id: TOAST_ID }
      )
    } finally {
      if (requestIdsRef.current[key] === requestId) {
        setKeyPending(key, false)
      }
    }
  }

  function onToggle(key: ToggleKey, checked: boolean) {
    void patch(
      { [key]: checked } as EmailNotificationSettingsUpdate,
      key
    )
  }

  return (
    <SettingsPage
      title="Notifications"
      description="Choose which email notifications you receive."
      width="narrow"
    >
      <SettingsSection>
        <SettingsRow
          label="Enable email notifications"
          description={
            hasEmail
              ? `Email notifications to ${email}`
              : "Add an email address in Profile to enable activity notifications."
          }
          control={
            <Switch
              checked={settings.enabled}
              disabled={!hasEmail || isPending("enabled")}
              onCheckedChange={(checked) =>
                patch({ enabled: checked }, "enabled")
              }
            />
          }
        />
      </SettingsSection>

      <div
        className={cn(
          "space-y-10 transition-opacity",
          !emailEnabled && "opacity-50"
        )}
        inert={!emailEnabled ? true : undefined}
      >
        <SettingsSection title="Delivery">
          <SettingsRow
            label="Notification format"
            description="Choose whether to group email notifications."
            control={
              <Select
                value={settings.format}
                disabled={!emailEnabled || isPending("format")}
                onValueChange={(value) => {
                  if (
                    !EMAIL_NOTIFICATION_FORMATS.has(
                      value as EmailNotificationFormat
                    )
                  ) {
                    return
                  }
                  void patch(
                    { format: value as EmailNotificationFormat },
                    "format"
                  )
                }}
              >
                <SelectTrigger size="sm" className="min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="digest">Digest</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </SettingsSection>

        {showDigestOptions ? (
          <SettingsSection title="Email digest settings">
            <SettingsRow
              label="Delay low priority emails outside of work hours"
              description="Hold non-urgent emails until the next work day."
              control={
                <Switch
                  checked={settings.delayOutsideWorkHours}
                  disabled={
                    !emailEnabled || isPending("delayOutsideWorkHours")
                  }
                  onCheckedChange={(checked) =>
                    onToggle("delayOutsideWorkHours", checked)
                  }
                />
              }
            />
            <SettingsRow
              label="Immediately notify for urgent issues"
              description="Notify right away if an issue assigned to you is marked urgent or breaches an SLA."
              control={
                <Switch
                  checked={settings.urgentImmediate}
                  disabled={!emailEnabled || isPending("urgentImmediate")}
                  onCheckedChange={(checked) =>
                    onToggle("urgentImmediate", checked)
                  }
                />
              }
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title="General notifications">
          <ToggleRows
            items={GENERAL_TOGGLES}
            settings={settings}
            disabled={!emailEnabled}
            isPending={isPending}
            onToggle={onToggle}
          />
        </SettingsSection>

        <SettingsSection title="Feature notifications">
          <ToggleRows
            items={FEATURE_TOGGLES}
            settings={settings}
            disabled={!emailEnabled}
            isPending={isPending}
            onToggle={onToggle}
          />
        </SettingsSection>
      </div>

      <SettingsSection title="Updates from Zyvia">
        <ToggleRows
          items={PRODUCT_TOGGLES}
          settings={settings}
          disabled={false}
          isPending={isPending}
          onToggle={onToggle}
        />
      </SettingsSection>
    </SettingsPage>
  )
}
