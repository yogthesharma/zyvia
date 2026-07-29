import type {
  CommentSubmitShortcut,
  DefaultHomeView,
  DisplayNameFormat,
  FirstDayOfWeek,
  FontSize,
  ThemeMode,
  ThemeVariant,
  UserPreferencesUpdate,
} from "@/lib/preferences/types"

export const THEME_MODES = new Set<ThemeMode>(["light", "dark", "system"])
export const THEME_VARIANTS = new Set<ThemeVariant>(["light", "dark"])
export const HOME_VIEWS = new Set<DefaultHomeView>([
  "issues",
  "inbox",
  "projects",
  "cycles",
  "views",
  "initiatives",
])
export const DISPLAY_FORMATS = new Set<DisplayNameFormat>([
  "username",
  "full_name",
  "full_name_and_username",
])
export const FONT_SIZES = new Set<FontSize>(["small", "default", "large"])
export const COMMENT_SHORTCUTS = new Set<CommentSubmitShortcut>([
  "mod_enter",
  "enter",
])

export function isDefaultHomeView(value: unknown): value is DefaultHomeView {
  return typeof value === "string" && HOME_VIEWS.has(value as DefaultHomeView)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

export function parsePreferencesUpdate(
  input: unknown
): { data?: UserPreferencesUpdate; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid preferences payload." }
  }

  const raw = input as Record<string, unknown>
  const data: UserPreferencesUpdate = {}

  if ("theme" in raw) {
    if (typeof raw.theme !== "string" || !THEME_MODES.has(raw.theme as ThemeMode)) {
      return { error: "Invalid interface theme." }
    }
    data.theme = raw.theme as ThemeMode
  }

  if ("defaultHomeView" in raw) {
    if (!isDefaultHomeView(raw.defaultHomeView)) {
      return { error: "Invalid default home view." }
    }
    data.defaultHomeView = raw.defaultHomeView
  }

  if ("displayNameFormat" in raw) {
    if (
      typeof raw.displayNameFormat !== "string" ||
      !DISPLAY_FORMATS.has(raw.displayNameFormat as DisplayNameFormat)
    ) {
      return { error: "Invalid display name format." }
    }
    data.displayNameFormat = raw.displayNameFormat as DisplayNameFormat
  }

  if ("firstDayOfWeek" in raw) {
    const day = Number(raw.firstDayOfWeek)
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return { error: "Invalid first day of the week." }
    }
    data.firstDayOfWeek = day as FirstDayOfWeek
  }

  if ("convertEmoticons" in raw) {
    if (!isBoolean(raw.convertEmoticons)) {
      return { error: "Invalid convert emoticons value." }
    }
    data.convertEmoticons = raw.convertEmoticons
  }

  if ("commentSubmitShortcut" in raw) {
    if (
      typeof raw.commentSubmitShortcut !== "string" ||
      !COMMENT_SHORTCUTS.has(raw.commentSubmitShortcut as CommentSubmitShortcut)
    ) {
      return { error: "Invalid comment submit shortcut." }
    }
    data.commentSubmitShortcut =
      raw.commentSubmitShortcut as CommentSubmitShortcut
  }

  if ("fontSize" in raw) {
    if (
      typeof raw.fontSize !== "string" ||
      !FONT_SIZES.has(raw.fontSize as FontSize)
    ) {
      return { error: "Invalid font size." }
    }
    data.fontSize = raw.fontSize as FontSize
  }

  if ("usePointerCursors" in raw) {
    if (!isBoolean(raw.usePointerCursors)) {
      return { error: "Invalid pointer cursors value." }
    }
    data.usePointerCursors = raw.usePointerCursors
  }

  if ("underlineLinks" in raw) {
    if (!isBoolean(raw.underlineLinks)) {
      return { error: "Invalid underline links value." }
    }
    data.underlineLinks = raw.underlineLinks
  }

  if ("themeLight" in raw) {
    if (
      typeof raw.themeLight !== "string" ||
      !THEME_VARIANTS.has(raw.themeLight as ThemeVariant)
    ) {
      return { error: "Invalid light theme." }
    }
    data.themeLight = raw.themeLight as ThemeVariant
  }

  if ("themeDark" in raw) {
    if (
      typeof raw.themeDark !== "string" ||
      !THEME_VARIANTS.has(raw.themeDark as ThemeVariant)
    ) {
      return { error: "Invalid dark theme." }
    }
    data.themeDark = raw.themeDark as ThemeVariant
  }

  if ("autoAssignToSelf" in raw) {
    if (!isBoolean(raw.autoAssignToSelf)) {
      return { error: "Invalid auto-assign value." }
    }
    data.autoAssignToSelf = raw.autoAssignToSelf
  }

  if ("autoAssignOnStarted" in raw) {
    if (!isBoolean(raw.autoAssignOnStarted)) {
      return { error: "Invalid auto-assign on started value." }
    }
    data.autoAssignOnStarted = raw.autoAssignOnStarted
  }

  if (Object.keys(data).length === 0) {
    return { error: "No preference changes provided." }
  }

  return { data }
}
