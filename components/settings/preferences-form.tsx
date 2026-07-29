"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  SettingsRow,
  SettingsSection,
} from "@/components/app/settings-page"
import { usePreferences } from "@/components/preferences-provider"
import { useTheme } from "@/components/theme-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { updatePreferences } from "@/lib/preferences/actions"
import { applyInterfacePreferences } from "@/lib/preferences/apply"
import type {
  CommentSubmitShortcut,
  DefaultHomeView,
  DisplayNameFormat,
  FirstDayOfWeek,
  FontSize,
  ThemeMode,
  ThemeVariant,
  UserPreferences,
  UserPreferencesUpdate,
} from "@/lib/preferences/types"

const TOAST_ID = "preferences-save"

const HOME_VIEW_OPTIONS: { value: DefaultHomeView; label: string }[] = [
  { value: "issues", label: "Issues" },
  { value: "inbox", label: "Inbox" },
  { value: "projects", label: "Projects" },
  { value: "cycles", label: "Cycles" },
  { value: "views", label: "Views" },
  { value: "initiatives", label: "Initiatives" },
]

const DISPLAY_NAME_OPTIONS: { value: DisplayNameFormat; label: string }[] = [
  { value: "username", label: "Username" },
  { value: "full_name", label: "Full name" },
  { value: "full_name_and_username", label: "Full name and username" },
]

const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
]

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System preference" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const THEME_VARIANT_OPTIONS: { value: ThemeVariant; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const COMMENT_SHORTCUT_OPTIONS: {
  value: CommentSubmitShortcut
  label: string
}[] = [
  { value: "mod_enter", label: "Ctrl / ⌘ + Enter" },
  { value: "enter", label: "Enter" },
]

function valuesEqual(
  current: UserPreferences[keyof UserPreferences],
  next: unknown
) {
  return current === next
}

export function PreferencesForm() {
  const { preferences, setPreferences } = usePreferences()
  const { setTheme } = useTheme()
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )
  const preferencesRef = React.useRef(preferences)
  const requestIdsRef = React.useRef<Record<string, number>>({})

  React.useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  function setKeyPending(key: string, pending: boolean) {
    setPendingKeys((prev) => {
      const next = new Set(prev)
      if (pending) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function patch(update: UserPreferencesUpdate, key: string) {
    const [field, value] = Object.entries(update)[0] ?? []
    if (
      field &&
      valuesEqual(
        preferencesRef.current[field as keyof UserPreferences],
        value
      )
    ) {
      return
    }

    const requestId = (requestIdsRef.current[key] ?? 0) + 1
    requestIdsRef.current[key] = requestId
    const previous = preferencesRef.current
    const next = { ...previous, ...update }
    const updatedKeys = Object.keys(update) as (keyof UserPreferences)[]

    preferencesRef.current = next
    setPreferences(next)
    setKeyPending(key, true)

    if (update.theme) setTheme(update.theme)
    applyInterfacePreferences(next)

    try {
      const result = await updatePreferences(update)

      if (requestIdsRef.current[key] !== requestId) return

      if (result.error) {
        setPreferences((prev) => {
          const rolled = { ...prev }
          for (const k of updatedKeys) {
            rolled[k] = previous[k] as never
          }
          preferencesRef.current = rolled
          applyInterfacePreferences(rolled)
          return rolled
        })
        if (update.theme !== undefined) setTheme(previous.theme)
        toast.error(result.error, { id: TOAST_ID })
        return
      }

      if (result.preferences) {
        setPreferences((prev) => {
          const merged = { ...prev }
          for (const k of updatedKeys) {
            merged[k] = result.preferences![k] as never
          }
          preferencesRef.current = merged
          applyInterfacePreferences(merged)
          return merged
        })
      }

      toast.success("Preferences saved", { id: TOAST_ID })
    } catch (error) {
      if (requestIdsRef.current[key] !== requestId) return

      setPreferences((prev) => {
        const rolled = { ...prev }
        for (const k of updatedKeys) {
          rolled[k] = previous[k] as never
        }
        preferencesRef.current = rolled
        applyInterfacePreferences(rolled)
        return rolled
      })
      if (update.theme !== undefined) setTheme(previous.theme)
      toast.error(
        error instanceof Error ? error.message : "Could not save preferences.",
        { id: TOAST_ID }
      )
    } finally {
      if (requestIdsRef.current[key] === requestId) {
        setKeyPending(key, false)
      }
    }
  }

  const isPending = (key: string) => pendingKeys.has(key)
  const systemThemeVisible = preferences.theme === "system"

  return (
    <>
      <SettingsSection title="General">
        <SettingsRow
          label="Default home view"
          description="Select which view to display when launching Zyvia."
          tooltip="Used after sign-in and when opening a workspace."
          control={
            <Select
              value={preferences.defaultHomeView}
              disabled={isPending("defaultHomeView")}
              onValueChange={(value) =>
                patch(
                  { defaultHomeView: value as DefaultHomeView },
                  "defaultHomeView"
                )
              }
            >
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {HOME_VIEW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingsRow
          label="Display names"
          description="Select how names are displayed in the Zyvia interface."
          control={
            <Select
              value={preferences.displayNameFormat}
              disabled={isPending("displayNameFormat")}
              onValueChange={(value) =>
                patch(
                  { displayNameFormat: value as DisplayNameFormat },
                  "displayNameFormat"
                )
              }
            >
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {DISPLAY_NAME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingsRow
          label="First day of the week"
          description="Used for date pickers."
          control={
            <Select
              value={String(preferences.firstDayOfWeek)}
              disabled={isPending("firstDayOfWeek")}
              onValueChange={(value) =>
                patch(
                  {
                    firstDayOfWeek: Number(value) as FirstDayOfWeek,
                  },
                  "firstDayOfWeek"
                )
              }
            >
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {WEEKDAY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingsRow
          label="Convert text emoticons into emojis"
          description="Strings like :) will be converted to 🙂."
          control={
            <Switch
              checked={preferences.convertEmoticons}
              disabled={isPending("convertEmoticons")}
              onCheckedChange={(checked) =>
                patch({ convertEmoticons: checked }, "convertEmoticons")
              }
            />
          }
        />

        <SettingsRow
          label="Send comments on…"
          description="Choose which key press is used to submit comments."
          control={
            <Select
              value={preferences.commentSubmitShortcut}
              disabled={isPending("commentSubmitShortcut")}
              onValueChange={(value) =>
                patch(
                  {
                    commentSubmitShortcut: value as CommentSubmitShortcut,
                  },
                  "commentSubmitShortcut"
                )
              }
            >
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {COMMENT_SHORTCUT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </SettingsSection>

      <SettingsSection title="Interface and theme">
        <SettingsRow
          label="Font size"
          description="Adjust the size of text across the app."
          control={
            <Select
              value={preferences.fontSize}
              disabled={isPending("fontSize")}
              onValueChange={(value) =>
                patch({ fontSize: value as FontSize }, "fontSize")
              }
            >
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingsRow
          label="Use pointer cursors"
          description="Change the cursor to a pointer when hovering over any interactive elements."
          control={
            <Switch
              checked={preferences.usePointerCursors}
              disabled={isPending("usePointerCursors")}
              onCheckedChange={(checked) =>
                patch({ usePointerCursors: checked }, "usePointerCursors")
              }
            />
          }
        />

        <SettingsRow
          label="Underline links"
          description="Always underline links in text content."
          control={
            <Switch
              checked={preferences.underlineLinks}
              disabled={isPending("underlineLinks")}
              onCheckedChange={(checked) =>
                patch({ underlineLinks: checked }, "underlineLinks")
              }
            />
          }
        />

        <SettingsRow
          label="Interface theme"
          description="Select or customize your interface color scheme."
          tooltip="You can also toggle light and dark with the d hotkey."
          control={
            <Select
              value={preferences.theme}
              disabled={isPending("theme")}
              onValueChange={(value) =>
                patch({ theme: value as ThemeMode }, "theme")
              }
            >
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {THEME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {systemThemeVisible ? (
          <>
            <SettingsRow
              label="Light"
              description="Theme to use for light system appearance."
              control={
                <Select
                  value={preferences.themeLight}
                  disabled={isPending("themeLight")}
                  onValueChange={(value) =>
                    patch(
                      { themeLight: value as ThemeVariant },
                      "themeLight"
                    )
                  }
                >
                  <SelectTrigger size="sm" className="min-w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {THEME_VARIANT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              label="Dark"
              description="Theme to use for dark system appearance."
              control={
                <Select
                  value={preferences.themeDark}
                  disabled={isPending("themeDark")}
                  onValueChange={(value) =>
                    patch({ themeDark: value as ThemeVariant }, "themeDark")
                  }
                >
                  <SelectTrigger size="sm" className="min-w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {THEME_VARIANT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Automations and workflows">
        <SettingsRow
          label="Auto-assign to self"
          description="When creating new issues, always assign them to yourself by default."
          control={
            <Switch
              checked={preferences.autoAssignToSelf}
              disabled={isPending("autoAssignToSelf")}
              onCheckedChange={(checked) =>
                patch({ autoAssignToSelf: checked }, "autoAssignToSelf")
              }
            />
          }
        />
        <SettingsRow
          label="On move to started status, assign to yourself"
          description="When you move an unassigned issue to started, it will be automatically assigned to you."
          control={
            <Switch
              checked={preferences.autoAssignOnStarted}
              disabled={isPending("autoAssignOnStarted")}
              onCheckedChange={(checked) =>
                patch(
                  { autoAssignOnStarted: checked },
                  "autoAssignOnStarted"
                )
              }
            />
          }
        />
      </SettingsSection>
    </>
  )
}
