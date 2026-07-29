import type { UserPreferences, UserPreferencesRow } from "@/lib/preferences/types"
import {
  COMMENT_SHORTCUTS,
  DISPLAY_FORMATS,
  FONT_SIZES,
  HOME_VIEWS,
  THEME_VARIANTS,
} from "@/lib/preferences/schema"

export const DEFAULT_PREFERENCES: Omit<UserPreferences, "theme"> = {
  defaultHomeView: "issues",
  displayNameFormat: "username",
  firstDayOfWeek: 0,
  convertEmoticons: true,
  commentSubmitShortcut: "mod_enter",
  fontSize: "default",
  usePointerCursors: false,
  underlineLinks: false,
  themeLight: "light",
  themeDark: "dark",
  autoAssignToSelf: false,
  autoAssignOnStarted: false,
}

export const PREFERENCES_SELECT =
  "default_home_view, display_name_format, first_day_of_week, convert_emoticons, comment_submit_shortcut, font_size, use_pointer_cursors, underline_links, theme_light, theme_dark, auto_assign_to_self, auto_assign_on_started" as const

function pick<T>(value: unknown, allowed: Set<T>, fallback: T): T {
  return allowed.has(value as T) ? (value as T) : fallback
}

export function mapPreferencesRow(
  row: UserPreferencesRow | null | undefined,
  theme: UserPreferences["theme"]
): UserPreferences {
  const firstDay = Number(
    row?.first_day_of_week ?? DEFAULT_PREFERENCES.firstDayOfWeek
  )
  const firstDayOfWeek = (
    Number.isInteger(firstDay) && firstDay >= 0 && firstDay <= 6
      ? firstDay
      : DEFAULT_PREFERENCES.firstDayOfWeek
  ) as UserPreferences["firstDayOfWeek"]

  return {
    theme:
      theme === "light" || theme === "dark" || theme === "system"
        ? theme
        : "dark",
    defaultHomeView: pick(
      row?.default_home_view,
      HOME_VIEWS,
      DEFAULT_PREFERENCES.defaultHomeView
    ),
    displayNameFormat: pick(
      row?.display_name_format,
      DISPLAY_FORMATS,
      DEFAULT_PREFERENCES.displayNameFormat
    ),
    firstDayOfWeek,
    convertEmoticons:
      typeof row?.convert_emoticons === "boolean"
        ? row.convert_emoticons
        : DEFAULT_PREFERENCES.convertEmoticons,
    commentSubmitShortcut: pick(
      row?.comment_submit_shortcut,
      COMMENT_SHORTCUTS,
      DEFAULT_PREFERENCES.commentSubmitShortcut
    ),
    fontSize: pick(
      row?.font_size,
      FONT_SIZES,
      DEFAULT_PREFERENCES.fontSize
    ),
    usePointerCursors:
      typeof row?.use_pointer_cursors === "boolean"
        ? row.use_pointer_cursors
        : DEFAULT_PREFERENCES.usePointerCursors,
    underlineLinks:
      typeof row?.underline_links === "boolean"
        ? row.underline_links
        : DEFAULT_PREFERENCES.underlineLinks,
    themeLight: pick(
      row?.theme_light,
      THEME_VARIANTS,
      DEFAULT_PREFERENCES.themeLight
    ),
    themeDark: pick(
      row?.theme_dark,
      THEME_VARIANTS,
      DEFAULT_PREFERENCES.themeDark
    ),
    autoAssignToSelf:
      typeof row?.auto_assign_to_self === "boolean"
        ? row.auto_assign_to_self
        : DEFAULT_PREFERENCES.autoAssignToSelf,
    autoAssignOnStarted:
      typeof row?.auto_assign_on_started === "boolean"
        ? row.auto_assign_on_started
        : DEFAULT_PREFERENCES.autoAssignOnStarted,
  }
}

export function toPreferencesPatch(update: Partial<UserPreferences>) {
  const patch: Record<string, unknown> = {}

  if (update.defaultHomeView !== undefined) {
    patch.default_home_view = update.defaultHomeView
  }
  if (update.displayNameFormat !== undefined) {
    patch.display_name_format = update.displayNameFormat
  }
  if (update.firstDayOfWeek !== undefined) {
    patch.first_day_of_week = update.firstDayOfWeek
  }
  if (update.convertEmoticons !== undefined) {
    patch.convert_emoticons = update.convertEmoticons
  }
  if (update.commentSubmitShortcut !== undefined) {
    patch.comment_submit_shortcut = update.commentSubmitShortcut
  }
  if (update.fontSize !== undefined) {
    patch.font_size = update.fontSize
  }
  if (update.usePointerCursors !== undefined) {
    patch.use_pointer_cursors = update.usePointerCursors
  }
  if (update.underlineLinks !== undefined) {
    patch.underline_links = update.underlineLinks
  }
  if (update.themeLight !== undefined) {
    patch.theme_light = update.themeLight
  }
  if (update.themeDark !== undefined) {
    patch.theme_dark = update.themeDark
  }
  if (update.autoAssignToSelf !== undefined) {
    patch.auto_assign_to_self = update.autoAssignToSelf
  }
  if (update.autoAssignOnStarted !== undefined) {
    patch.auto_assign_on_started = update.autoAssignOnStarted
  }

  return patch
}
