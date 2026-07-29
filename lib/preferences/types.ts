export type ThemeMode = "light" | "dark" | "system"
export type ThemeVariant = "light" | "dark"

export type DefaultHomeView =
  | "issues"
  | "inbox"
  | "projects"
  | "cycles"
  | "views"
  | "initiatives"

export type DisplayNameFormat =
  | "username"
  | "full_name"
  | "full_name_and_username"

export type FontSize = "small" | "default" | "large"

export type CommentSubmitShortcut = "mod_enter" | "enter"

/** First day of week: 0 = Sunday … 6 = Saturday */
export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type UserPreferences = {
  theme: ThemeMode
  defaultHomeView: DefaultHomeView
  displayNameFormat: DisplayNameFormat
  firstDayOfWeek: FirstDayOfWeek
  convertEmoticons: boolean
  commentSubmitShortcut: CommentSubmitShortcut
  fontSize: FontSize
  usePointerCursors: boolean
  underlineLinks: boolean
  themeLight: ThemeVariant
  themeDark: ThemeVariant
  autoAssignToSelf: boolean
  autoAssignOnStarted: boolean
}

export type UserPreferencesUpdate = Partial<UserPreferences>

export type UserPreferencesRow = {
  user_id: string
  default_home_view: DefaultHomeView
  display_name_format: DisplayNameFormat
  first_day_of_week: number
  convert_emoticons: boolean
  comment_submit_shortcut: CommentSubmitShortcut
  font_size: FontSize
  use_pointer_cursors: boolean
  underline_links: boolean
  theme_light: ThemeVariant
  theme_dark: ThemeVariant
  auto_assign_to_self: boolean
  auto_assign_on_started: boolean
}
