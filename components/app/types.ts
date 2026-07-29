export type ShellWorkspace = {
  id: string
  name: string
  slug: string
}

export type ShellTeam = {
  id: string
  name: string
  key: string
}

export type ShellUser = {
  email?: string | null
  fullName?: string | null
}
