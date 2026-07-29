"use client"

import type { ReactNode } from "react"
import {
  ArrowUpRightIcon,
  GithubLogoIcon,
  NotionLogoIcon,
  SlackLogoIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { SettingsPage } from "@/components/app/settings-page"

const TOAST_ID = "connected-accounts-soon"

type Account = {
  id: string
  name: string
  description: string
  icon: ReactNode
}

function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#fff"
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z"
      />
      <path fill="#1A73E8" d="M12 12h5v5h-5z" />
      <path fill="#EA4335" d="M5 4h3v2H5z" />
      <path fill="#FBBC04" d="M8 4h4v2H8z" />
      <path fill="#34A853" d="M12 4h4v2h-4z" />
      <path fill="#4285F4" d="M16 4h3v2h-3z" />
    </svg>
  )
}

const ACCOUNTS: Account[] = [
  {
    id: "slack",
    name: "Slack",
    description:
      "Sync your message attribution, and receive notifications in Slack",
    icon: <SlackLogoIcon className="size-5" weight="fill" />,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your calendar out-of-office status to Zyvia",
    icon: <GoogleCalendarIcon className="size-5" />,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Preview issues, projects, and views within Notion",
    icon: <NotionLogoIcon className="size-5" weight="fill" />,
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Sync attribution of your commits, pull requests, and comments",
    icon: <GithubLogoIcon className="size-5" weight="fill" />,
  },
]

function showComingSoon() {
  toast("Coming soon", { id: TOAST_ID })
}

export function ConnectedAccounts() {
  return (
    <SettingsPage
      title="Connected accounts"
      description="Connect your user accounts to sync attribution of your actions between apps"
    >
      <div className="space-y-3">
        {ACCOUNTS.map((account) => (
          <div
            key={account.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card/40 px-4 py-4 sm:items-center"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
              {account.icon}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">{account.name}</p>
              <p className="text-sm text-muted-foreground">
                {account.description}
              </p>
            </div>
            <button
              type="button"
              onClick={showComingSoon}
              className="inline-flex shrink-0 items-center gap-1 self-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Connect
              <ArrowUpRightIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </SettingsPage>
  )
}
