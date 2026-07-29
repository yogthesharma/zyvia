"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AppWindowIcon,
  ArrowLeftIcon,
  ArrowsLeftRightIcon,
  BellIcon,
  BroadcastIcon,
  BuildingsIcon,
  ChatCircleIcon,
  CodeIcon,
  CreditCardIcon,
  CubeIcon,
  GearSixIcon,
  HandshakeIcon,
  KeyIcon,
  LockIcon,
  PlugsIcon,
  PlusIcon,
  PulseIcon,
  RobotIcon,
  RocketIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  SmileyIcon,
  SparkleIcon,
  StackIcon,
  TagSimpleIcon,
  TimerIcon,
  UserCircleIcon,
  UsersIcon,
} from "@phosphor-icons/react"

import { TeamIcon } from "@/components/app/team-icon"
import type { ShellTeam, ShellWorkspace } from "@/components/app/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type NavLink = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type NavSection = {
  title: string
  items: NavLink[]
}

function SettingsNavItem({
  item,
  active,
}: {
  item: NavLink
  active: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      {active ? (
        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-foreground" />
      ) : null}
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function SettingsSidebar({
  workspace,
  teams,
}: {
  workspace: ShellWorkspace
  teams: ShellTeam[]
}) {
  const pathname = usePathname()
  const base = `/w/${workspace.slug}/settings`
  const appBase = `/w/${workspace.slug}`

  const sections: NavSection[] = [
    {
      title: "Account",
      items: [
        { href: `${base}/preferences`, label: "Preferences", icon: GearSixIcon },
        { href: `${base}/profile`, label: "Profile", icon: UserCircleIcon },
        { href: `${base}/notifications`, label: "Notifications", icon: BellIcon },
        {
          href: `${base}/security`,
          label: "Security & access",
          icon: ShieldCheckIcon,
        },
        {
          href: `${base}/connected-accounts`,
          label: "Connected accounts",
          icon: PlugsIcon,
        },
        {
          href: `${base}/agent-personalization`,
          label: "Agent personalization",
          icon: RobotIcon,
        },
      ],
    },
    {
      title: "Issues",
      items: [
        { href: `${base}/labels`, label: "Labels", icon: TagSimpleIcon },
        { href: `${base}/templates`, label: "Templates", icon: StackIcon },
        { href: `${base}/slas`, label: "SLAs", icon: TimerIcon },
      ],
    },
    {
      title: "Projects",
      items: [
        {
          href: `${base}/project-labels`,
          label: "Labels",
          icon: TagSimpleIcon,
        },
        {
          href: `${base}/project-templates`,
          label: "Templates",
          icon: StackIcon,
        },
        { href: `${base}/statuses`, label: "Statuses", icon: SealCheckIcon },
        { href: `${base}/updates`, label: "Updates", icon: PulseIcon },
      ],
    },
    {
      title: "Features",
      items: [
        { href: `${base}/ai`, label: "AI & Agents", icon: RobotIcon },
        { href: `${base}/initiatives`, label: "Initiatives", icon: SparkleIcon },
        { href: `${base}/documents`, label: "Documents", icon: CubeIcon },
        {
          href: `${base}/customer-requests`,
          label: "Customer requests",
          icon: HandshakeIcon,
        },
        { href: `${base}/releases`, label: "Releases", icon: RocketIcon },
        { href: `${base}/pulse`, label: "Pulse", icon: BroadcastIcon },
        { href: `${base}/asks`, label: "Asks", icon: ChatCircleIcon },
        { href: `${base}/emojis`, label: "Emojis", icon: SmileyIcon },
        { href: `${base}/integrations`, label: "Integrations", icon: CodeIcon },
      ],
    },
    {
      title: "Administration",
      items: [
        { href: `${base}/workspace`, label: "Workspace", icon: BuildingsIcon },
        { href: `${base}/teams`, label: "Teams", icon: UsersIcon },
        { href: `${base}/members`, label: "Members", icon: UsersIcon },
        {
          href: `${base}/workspace-security`,
          label: "Security",
          icon: LockIcon,
        },
        { href: `${base}/api`, label: "API", icon: KeyIcon },
        {
          href: `${base}/applications`,
          label: "Applications",
          icon: AppWindowIcon,
        },
        { href: `${base}/billing`, label: "Billing", icon: CreditCardIcon },
        {
          href: `${base}/import-export`,
          label: "Import & export",
          icon: ArrowsLeftRightIcon,
        },
      ],
    },
  ]

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 p-3">
        <Link
          href={`${appBase}/issues`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to app
        </Link>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-5 p-3">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SettingsNavItem
                    key={item.href}
                    item={item}
                    active={
                      pathname === item.href ||
                      (item.href.endsWith("/preferences") &&
                        pathname === `/w/${workspace.slug}/settings`) ||
                      (item.href.endsWith("/teams") &&
                        pathname.startsWith(`${item.href}/`)) ||
                      (item.href.endsWith("/agent-personalization") &&
                        pathname.startsWith(`${base}/skill`))
                    }
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Your teams
            </p>
            <div className="space-y-0.5">
              {teams.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  No teams yet
                </p>
              ) : (
                teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`${base}/teams`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      pathname === `${base}/teams`
                        ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <TeamIcon icon={team.icon} className="size-4" />
                    <span className="truncate">{team.name}</span>
                  </Link>
                ))
              )}
              <Link
                href={`${base}/teams/new`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  pathname === `${base}/teams/new`
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
              >
                <PlusIcon className="size-4 shrink-0 opacity-80" />
                <span className="truncate">Create a team</span>
              </Link>
            </div>
          </div>
        </nav>
      </ScrollArea>
    </aside>
  )
}
