"use client"

import { SettingsSidebar } from "@/components/app/settings-sidebar"
import type { ShellWorkspace } from "@/components/app/types"

export function SettingsShell({
  workspace,
  children,
}: {
  workspace: ShellWorkspace
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <SettingsSidebar workspace={workspace} />
      <main className="flex min-w-0 flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  )
}
