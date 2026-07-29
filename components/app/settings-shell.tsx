"use client"

import { SettingsSidebar } from "@/components/app/settings-sidebar"
import type { ShellTeam, ShellWorkspace } from "@/components/app/types"

export function SettingsShell({
  workspace,
  teams,
  children,
}: {
  workspace: ShellWorkspace
  teams: ShellTeam[]
  children: React.ReactNode
}) {
  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <SettingsSidebar workspace={workspace} teams={teams} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
