export type ShellWorkspace = {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
}

export type ShellTeam = {
  id: string
  name: string
  key: string
  icon?: string | null
}

export type ShellUser = {
  email?: string | null
  fullName?: string | null
}
