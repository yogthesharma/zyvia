import { useMemo, useState, type ReactNode } from 'react'
import { SettingsShell } from '~/components/settings-shell'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

type Props = {
  section: string
}

function PreferenceRow({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: ReactNode
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0">{control}</div>
      </div>
    </div>
  )
}

const sectionTitleMap: Record<string, string> = {
  preferences: 'Preferences',
  profile: 'Profile',
  notifications: 'Notifications',
  'security-access': 'Security & access',
  'connected-accounts': 'Connected accounts',
  'agent-personalization': 'Agent personalization',
  'issues-labels': 'Issue labels',
  'issues-templates': 'Issue templates',
  'issues-slas': 'Issue SLAs',
  'projects-labels': 'Project labels',
  'projects-templates': 'Project templates',
  'projects-statuses': 'Project statuses',
  'projects-updates': 'Project updates',
  'features-ai-agents': 'AI & Agents',
  'features-initiatives': 'Initiatives',
  'features-documents': 'Documents',
  'features-customer-requests': 'Customer requests',
  'features-pulse': 'Pulse',
  'features-asks': 'Asks',
  'features-emojis': 'Emojis',
  'features-integrations': 'Integrations',
  'administration-workspace': 'Workspace administration',
  'administration-teams': 'Teams',
  'administration-members': 'Members',
}

function PreferencesView() {
  const [emojiMode, setEmojiMode] = useState(true)
  const [pointerCursor, setPointerCursor] = useState(false)
  const [desktopLinks, setDesktopLinks] = useState(false)
  const [autoAssign, setAutoAssign] = useState(false)
  const [gitStatusMove, setGitStatusMove] = useState(false)
  const [codingToolMove, setCodingToolMove] = useState(false)
  const [startedStatusAssign, setStartedStatusAssign] = useState(false)

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">General</h2>
        <Card className="gap-0 overflow-hidden py-0">
          <PreferenceRow
            title="Default home view"
            description="Select which view to display when launching Zyvia"
            control={
              <Select defaultValue="active-issues">
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active-issues">Active issues</SelectItem>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  <SelectItem value="assigned">Assigned to me</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <Separator />
          <PreferenceRow
            title="Display names"
            description="Select how names are displayed in the app interface"
            control={
              <Select defaultValue="username">
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="full-name">Full name</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <Separator />
          <PreferenceRow
            title="First day of the week"
            description="Used for date pickers"
            control={
              <Select defaultValue="monday">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <Separator />
          <PreferenceRow
            title="Convert text emoticons into emojis"
            description="Strings like :) will be converted to emoji"
            control={<Switch checked={emojiMode} onCheckedChange={setEmojiMode} />}
          />
          <Separator />
          <PreferenceRow
            title="Send comment on..."
            description="Choose which key press is used to submit a comment"
            control={
              <Select defaultValue="cmd-enter">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmd-enter">⌘ + Enter</SelectItem>
                  <SelectItem value="enter">Enter</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Interface and theme</h2>
        <Card className="gap-0 overflow-hidden py-0">
          <PreferenceRow
            title="App sidebar"
            description="Customize sidebar item visibility, ordering, and badge style"
            control={<button className="text-sm font-medium text-foreground">Customize</button>}
          />
          <Separator />
          <PreferenceRow
            title="Font size"
            description="Adjust text size across the app"
            control={
              <Select defaultValue="default">
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <Separator />
          <PreferenceRow
            title="Use pointer cursors"
            description="Change cursor to pointer when hovering interactive elements"
            control={<Switch checked={pointerCursor} onCheckedChange={setPointerCursor} />}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Desktop application</h2>
        <Card className="gap-0 overflow-hidden py-0">
          <PreferenceRow
            title="Open in desktop app"
            description="Automatically open links in desktop app when possible"
            control={<Switch checked={desktopLinks} onCheckedChange={setDesktopLinks} />}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Automations and workflows</h2>
        <Card className="gap-0 overflow-hidden py-0">
          <PreferenceRow
            title="Auto-assign to self"
            description="Automatically assign newly created issues to yourself"
            control={<Switch checked={autoAssign} onCheckedChange={setAutoAssign} />}
          />
          <Separator />
          <PreferenceRow
            title="Git attachment format"
            description="The format of GitHub/GitLab attachments on issues"
            control={
              <Select defaultValue="title">
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <Separator />
          <PreferenceRow
            title="On git branch copy, move issue to started status"
            description="Move issue to first started workflow status when copying git branch"
            control={<Switch checked={gitStatusMove} onCheckedChange={setGitStatusMove} />}
          />
          <Separator />
          <PreferenceRow
            title="On open in coding tool, move issue to started status"
            description="Move issue to first started workflow status when opening in coding tool"
            control={<Switch checked={codingToolMove} onCheckedChange={setCodingToolMove} />}
          />
          <Separator />
          <PreferenceRow
            title="On move to started status, assign to yourself"
            description="When moving an unassigned issue to started, assign to yourself"
            control={<Switch checked={startedStatusAssign} onCheckedChange={setStartedStatusAssign} />}
          />
        </Card>
      </section>
    </div>
  )
}

export default function SettingsSectionPage({ section }: Props) {
  const title = useMemo(() => sectionTitleMap[section] ?? 'Settings', [section])

  return (
    <SettingsShell title={title}>
      {section === 'preferences' ? (
        <PreferencesView />
      ) : (
        <Card className="px-4 py-5">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            This section shell is ready. We can now wire backend-backed settings values and save actions.
          </p>
        </Card>
      )}
    </SettingsShell>
  )
}
