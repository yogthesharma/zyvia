"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CircleIcon,
  CirclesThreePlusIcon,
  CubeIcon,
  FileArrowUpIcon,
  GearSixIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RobotIcon,
  SignOutIcon,
  SquaresFourIcon,
  StackIcon,
  TargetIcon,
  TrayIcon,
  UsersIcon,
} from "@phosphor-icons/react"

import { TeamIcon } from "@/components/app/team-icon"
import type { ShellTeam, ShellUser, ShellWorkspace } from "@/components/app/types"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { signOut } from "@/lib/auth/actions"

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link href={href}>
          <Icon className="size-3.5" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({
  workspace,
  teams,
  user: _user,
}: {
  workspace: ShellWorkspace
  teams: ShellTeam[]
  user: ShellUser
}) {
  const pathname = usePathname()
  const base = `/w/${workspace.slug}`
  const issuesHref = `${base}/issues`
  const settingsHref = `${base}/settings`
  const membersHref = `${base}/settings/members`
  const primaryTeam = teams[0]

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-sidebar-border"
    >
      <SidebarHeader className="gap-1 px-2 py-2">
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="min-w-0 flex-1 data-[state=open]:bg-sidebar-accent">
                {workspace.logoUrl ? (
                  <span className="relative flex size-5 shrink-0 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={workspace.logoUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  </span>
                ) : (
                  <div className="flex size-5 items-center justify-center rounded bg-violet-600 text-[10px] font-semibold text-white">
                    {workspace.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="truncate font-medium">{workspace.name}</span>
                <CaretDownIcon className="size-3 opacity-60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="start" side="bottom">
              <DropdownMenuItem asChild>
                <Link href={settingsHref}>
                  <GearSixIcon />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={membersHref}>
                  <UsersIcon />
                  Invite and manage members
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <CubeIcon />
                Switch workspace
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  void signOut()
                }}
              >
                <SignOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7 shrink-0"
            disabled
            title="Search"
          >
            <MagnifyingGlassIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7 shrink-0"
            disabled
            title="New issue"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                href={issuesHref}
                label="My issues"
                icon={CirclesThreePlusIcon}
                active={false}
              />
              <NavItem
                href={`${base}/inbox`}
                label="Inbox"
                icon={TrayIcon}
                active={pathname.startsWith(`${base}/inbox`)}
              />
              <NavItem
                href={`${base}/agents`}
                label="Agent"
                icon={RobotIcon}
                active={pathname.startsWith(`${base}/agents`)}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel>
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                href={`${base}/projects`}
                label="Projects"
                icon={SquaresFourIcon}
                active={pathname.startsWith(`${base}/projects`)}
              />
              <NavItem
                href={`${base}/views`}
                label="Views"
                icon={StackIcon}
                active={pathname.startsWith(`${base}/views`)}
              />
              <NavItem
                href={`${base}/initiatives`}
                label="Initiatives"
                icon={TargetIcon}
                active={pathname.startsWith(`${base}/initiatives`)}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel>
            Your teams
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teams.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span className="text-muted-foreground">No teams yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                teams.map((team) => {
                  const open =
                    pathname.startsWith(base) &&
                    !pathname.includes("/settings")

                  return (
                    <Collapsible
                      key={team.id}
                      defaultOpen={team.id === primaryTeam?.id}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="[&>svg:last-child]:ml-auto">
                            <TeamIcon icon={team.icon} fallback={team.key} />
                            <span className="truncate">{team.name}</span>
                            <CaretDownIcon className="size-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link
                                  href={`${base}/team/${team.key.toLowerCase()}`}
                                >
                                  <HouseIcon className="size-3.5" />
                                  <span>Home</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  open && pathname.startsWith(issuesHref)
                                }
                              >
                                <Link href={issuesHref}>
                                  <CircleIcon className="size-3.5" />
                                  <span>Issues</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href={`${base}/cycles`}>
                                  <ArrowsClockwiseIcon className="size-3.5" />
                                  <span>Cycles</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href={`${base}/projects`}>
                                  <SquaresFourIcon className="size-3.5" />
                                  <span>Projects</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href={`${base}/views`}>
                                  <StackIcon className="size-3.5" />
                                  <span>Views</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/try">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-muted-foreground [&>svg:last-child]:ml-auto">
                      <span>Try</span>
                      <CaretDownIcon className="size-3 transition-transform group-data-[state=open]/try:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href={`${base}/import`}>
                            <FileArrowUpIcon className="size-3.5" />
                            <span>Import issues</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith(membersHref)}
                        >
                          <Link href={membersHref}>
                            <PlusIcon className="size-3.5" />
                            <span>Invite people</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
