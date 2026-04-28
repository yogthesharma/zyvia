import {
  Bot,
  CircleDashed,
  FilePlus2,
  GalleryVerticalEnd,
  Home,
  Inbox,
  Radar,
  Sparkles,
  SquareKanban,
  SquareTerminal,
} from 'lucide-react'
import { Link } from '@inertiajs/react'
import { AppSwitcher } from '~/components/team-switcher'
import { NavProjects } from '~/components/nav-projects'
import { NavUser } from '~/components/nav-user'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

export function AppSidebar({
  user,
  workspaceSlug,
  sidebarModel,
  workspaces,
}: {
  user?: {
    fullName?: string | null
    email?: string | null
    initials?: string | null
  }
  workspaceSlug?: string
  sidebarModel?: {
    sections: Array<{
      key: string
      label?: string
      items: Array<{ key: string; title: string; url: string; iconKey: string }>
    }>
    apps: Array<{
      name: string
      url: string
      iconKey: string
      items: Array<{ title: string; url: string }>
    }>
  }
  workspaces?: {
    name: string
    slug: string
  }[]
}) {
  const currentWorkspaceSlug = workspaceSlug ?? 'personal-workspace'
  const logoCycle = [Home, SquareTerminal, Sparkles, Bot, SquareKanban, GalleryVerticalEnd] as const
  const workspaceOptions = (workspaces ?? []).map((workspace, index) => ({
    ...workspace,
    logo: logoCycle[index % logoCycle.length],
    plan: 'Team',
  }))
  const hasCurrentWorkspace = workspaceOptions.some((workspace) => workspace.slug === currentWorkspaceSlug)
  const switcherWorkspaces = hasCurrentWorkspace
    ? workspaceOptions
    : [
        { name: 'Current Workspace', slug: currentWorkspaceSlug, logo: SquareTerminal, plan: 'Team' },
        ...workspaceOptions,
      ]
  const model = sidebarModel ?? { sections: [], apps: [] }
  const iconByKey = {
    home: Home,
    radar: Radar,
    'file-plus': FilePlus2,
    inbox: Inbox,
    circle: CircleDashed,
    kanban: SquareKanban,
    sparkles: Sparkles,
    bot: Bot,
    terminal: SquareTerminal,
  } as const
  const sectionEntries = model.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      icon: iconByKey[item.iconKey as keyof typeof iconByKey] ?? Home,
    })),
  }))
  const projectItems = model.apps.map((app) => ({
    name: app.name,
    url: app.url,
    icon: iconByKey[app.iconKey as keyof typeof iconByKey] ?? Home,
    items: app.items,
  }))

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <AppSwitcher
          activeWorkspaceSlug={workspaceSlug}
          workspaces={switcherWorkspaces}
        />
      </SidebarHeader>
      <SidebarContent>
        {sectionEntries.map((section) => (
          <SidebarGroup key={section.key}>
            {section.label ? <SidebarGroupLabel>{section.label}</SidebarGroupLabel> : null}
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        {projectItems.length > 0 ? <NavProjects label="Your apps" projects={projectItems} /> : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          workspaceSlug={workspaceSlug}
          user={{
            name: user?.fullName ?? 'Guest User',
            email: user?.email ?? 'guest@zyvia.app',
            initials: user?.initials ?? 'GU',
            avatar: '',
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
