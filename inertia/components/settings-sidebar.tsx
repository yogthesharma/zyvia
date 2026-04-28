import {
  ArrowLeft,
  Bell,
  Bot,
  Cable,
  CircleDotDashed,
  FileText,
  Flame,
  FolderKanban,
  Gauge,
  HeartHandshake,
  Link2,
  Rocket,
  Settings2,
  Shield,
  Smile,
  Tag,
  UserRound,
  Users,
} from 'lucide-react'
import type React from 'react'
import { Link } from '@inertiajs/react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

type SettingsSidebarProps = {
  workspaceSlug?: string
  currentUrl: string
}

const personalSections = [
  { key: 'preferences', label: 'Preferences', icon: Settings2 },
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security-access', label: 'Security & access', icon: Shield },
  { key: 'connected-accounts', label: 'Connected accounts', icon: Link2 },
  { key: 'agent-personalization', label: 'Agent personalization', icon: Bot },
]

const groupedSections: Array<{
  group: string
  items: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }> }>
}> = [
  {
    group: 'Issues',
    items: [
      { key: 'issues-labels', label: 'Labels', icon: Tag },
      { key: 'issues-templates', label: 'Templates', icon: FileText },
      { key: 'issues-slas', label: 'SLAs', icon: Flame },
    ],
  },
  {
    group: 'Projects',
    items: [
      { key: 'projects-labels', label: 'Labels', icon: Tag },
      { key: 'projects-templates', label: 'Templates', icon: FileText },
      { key: 'projects-statuses', label: 'Statuses', icon: CircleDotDashed },
      { key: 'projects-updates', label: 'Updates', icon: Gauge },
    ],
  },
  {
    group: 'Features',
    items: [
      { key: 'features-ai-agents', label: 'AI & Agents', icon: Bot },
      { key: 'features-initiatives', label: 'Initiatives', icon: Rocket },
      { key: 'features-documents', label: 'Documents', icon: FileText },
      { key: 'features-customer-requests', label: 'Customer requests', icon: HeartHandshake },
      { key: 'features-pulse', label: 'Pulse', icon: Gauge },
      { key: 'features-asks', label: 'Asks', icon: Cable },
      { key: 'features-emojis', label: 'Emojis', icon: Smile },
      { key: 'features-integrations', label: 'Integrations', icon: Link2 },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key: 'administration-workspace', label: 'Workspace', icon: FolderKanban },
      { key: 'administration-teams', label: 'Teams', icon: Users },
      { key: 'administration-members', label: 'Members', icon: Users },
    ],
  },
]

export function SettingsSidebar({ workspaceSlug, currentUrl }: SettingsSidebarProps) {
  const basePath = workspaceSlug ? `/${workspaceSlug}/settings` : '/settings'

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href={workspaceSlug ? `/${workspaceSlug}` : '/'}>
                <ArrowLeft />
                <span>Back to app</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {personalSections.map((entry) => {
              const href = `${basePath}/${entry.key}`
              const isActive = currentUrl === href || currentUrl.startsWith(`${href}/`)
              const Icon = entry.icon

              return (
                <SidebarMenuItem key={entry.key}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={href}>
                      <Icon />
                      <span>{entry.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {groupedSections.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((entry) => {
                const href = `${basePath}/${entry.key}`
                const isActive = currentUrl === href || currentUrl.startsWith(`${href}/`)
                const Icon = entry.icon

                return (
                  <SidebarMenuItem key={entry.key}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={href}>
                        <Icon />
                        <span>{entry.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
