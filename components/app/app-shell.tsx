"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { AppSidebar } from "@/components/app/app-sidebar"
import type { ShellTeam, ShellUser, ShellWorkspace } from "@/components/app/types"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppShell({
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
  const base = `/w/${workspace.slug}`
  const crumbTeam = teams[0]?.name ?? workspace.name
  const title = pathname.startsWith(`${base}/issues`)
    ? "Issues"
    : pathname.startsWith(`${base}/inbox`)
      ? "Inbox"
      : pathname.startsWith(`${base}/projects`)
        ? "Projects"
        : pathname.startsWith(`${base}/views`)
          ? "Views"
          : pathname.startsWith(`${base}/initiatives`)
            ? "Initiatives"
            : pathname.startsWith(`${base}/cycles`)
              ? "Cycles"
              : pathname.startsWith(`${base}/agents`)
                ? "Agents"
                : "Home"

  return (
    <SidebarProvider>
      <AppSidebar workspace={workspace} teams={teams} user={user} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="-ml-1" />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{crumbTeam}</span>
            <span className="opacity-40">›</span>
            <span className="truncate text-foreground">{title}</span>
          </div>
          <Button size="sm" variant="outline" disabled>
            New issue
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
