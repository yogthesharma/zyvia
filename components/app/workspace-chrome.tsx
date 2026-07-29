"use client"

import { usePathname } from "next/navigation"

import { AppShell } from "@/components/app/app-shell"
import { SettingsShell } from "@/components/app/settings-shell"
import type { ShellTeam, ShellUser, ShellWorkspace } from "@/components/app/types"

export function WorkspaceChrome({
  workspace,
  teams,
  user,
  children,
}: {
  workspace: ShellWorkspace
  teams: ShellTeam[]
  user: ShellUser
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isSettings = pathname.includes(`/w/${workspace.slug}/settings`)

  if (isSettings) {
    return (
      <SettingsShell workspace={workspace} teams={teams}>
        {children}
      </SettingsShell>
    )
  }

  return (
    <AppShell workspace={workspace} teams={teams} user={user}>
      {children}
    </AppShell>
  )
}
