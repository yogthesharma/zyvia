export type ProfileSettings = {
  id: string
  email: string
  fullName: string
  title: string
  username: string
  avatarUrl: string | null
}

export type ProfileSettingsUpdate = {
  fullName?: string
  title?: string
  username?: string
}

export type ProfileActionResult = {
  error?: string
  profile?: ProfileSettings
  available?: boolean
  redirectTo?: string
}
