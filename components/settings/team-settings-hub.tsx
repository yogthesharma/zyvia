"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BellIcon,
  CaretRightIcon,
  CirclesThreePlusIcon,
  CubeIcon,
  FunnelIcon,
  GearSixIcon,
  GitBranchIcon,
  LightningIcon,
  PulseIcon,
  RobotIcon,
  StackIcon,
  TagSimpleIcon,
  TimerIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  SettingsSection,
  SettingsSubpage,
} from "@/components/app/settings-page"
import { TeamIcon } from "@/components/app/team-icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  leaveTeam,
  restoreDeletedTeam,
  restoreRetiredTeam,
  retireTeam,
  softDeleteTeam,
} from "@/lib/teams/actions"
import type { TeamSettings } from "@/lib/teams/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "team-settings"

function SettingsLinkRow({
  href,
  icon: Icon,
  label,
  description,
  value,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  value?: string
}) {
  return (
    <Link
      href={href}
      className="group grid grid-cols-[1.25rem_minmax(0,1fr)_6.75rem_1rem] items-center gap-x-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <span
        className={cn(
          "truncate text-right text-sm text-muted-foreground tabular-nums",
          !value && "opacity-0"
        )}
      >
        {value || "—"}
      </span>
      <CaretRightIcon className="size-3.5 justify-self-end text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
    </Link>
  )
}

function DangerRow({
  label,
  description,
  action,
}: {
  label: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function TeamSettingsHub({
  workspaceSlug,
  team,
}: {
  workspaceSlug: string
  team: TeamSettings
}) {
  const router = useRouter()
  const base = `/w/${workspaceSlug}/settings/teams/${team.key.toLowerCase()}`
  const overviewHref = `/w/${workspaceSlug}/team/${team.key.toLowerCase()}`
  const [pending, setPending] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [confirmName, setConfirmName] = React.useState("")

  const accessLabel =
    team.visibility === "private"
      ? "Private to team members"
      : "Accessible to all workspace members"

  const memberLabel =
    team.memberCount === 1 ? "1 member" : `${team.memberCount} members`
  const statusLabel =
    team.workflowStateCount === 1
      ? "1 status"
      : `${team.workflowStateCount} statuses`

  async function runAction(
    action: () => Promise<{ error?: string; redirectTo?: string }>,
    successMessage: string
  ): Promise<boolean> {
    if (pending) return false
    setPending(true)
    try {
      const result = await action()
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return false
      }
      toast.success(successMessage, { id: TOAST_ID })
      if (result.redirectTo) {
        router.push(result.redirectTo)
      }
      router.refresh()
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
        { id: TOAST_ID }
      )
      return false
    } finally {
      setPending(false)
    }
  }

  const showLeave = team.isMember && team.status !== "deleted"
  const showRetireRestore =
    team.canManage && (team.status === "active" || team.status === "retired")
  const showDelete = team.canManage && team.status !== "deleted"
  const showRestoreDeleted = team.canManage && team.status === "deleted"
  const showDangerZone =
    showLeave || showRetireRestore || showDelete || showRestoreDeleted

  return (
    <SettingsSubpage
      backHref={`/w/${workspaceSlug}/settings/teams`}
      backLabel="Teams"
    >
      <div className="mx-auto w-full max-w-3xl px-8 pt-12 pb-10">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5">
              <TeamIcon icon={team.icon} className="size-5" />
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {team.name}
              </h1>
            </div>
            <p className="pl-[1.875rem] text-sm text-muted-foreground">
              {accessLabel}
            </p>
            {team.status === "retired" ? (
              <p className="pl-[1.875rem] text-sm text-amber-500">
                This team is retired.
              </p>
            ) : null}
            {team.status === "deleted" ? (
              <p className="pl-[1.875rem] text-sm text-destructive">
                This team is deleted and can be restored.
              </p>
            ) : null}
          </div>
          {team.status !== "deleted" ? (
            <Link
              href={overviewHref}
              className="mt-1 inline-flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Team overview
              <CaretRightIcon className="size-3.5 opacity-70" />
            </Link>
          ) : null}
        </header>

        {team.status === "deleted" ? (
          <div className="space-y-8">
            {showDangerZone ? (
              <SettingsSection title="Danger zone">
                {showRestoreDeleted ? (
                  <DangerRow
                    label="Restore team"
                    description="Bring this team back and make it active again."
                    action={
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          runAction(
                            () =>
                              restoreDeletedTeam({
                                workspaceId: team.workspaceId,
                                workspaceSlug,
                                teamId: team.id,
                              }),
                            "Team restored"
                          )
                        }
                      >
                        Restore…
                      </Button>
                    }
                  />
                ) : null}
              </SettingsSection>
            ) : (
              <p className="text-sm text-muted-foreground">
                You do not have permission to restore this team.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <SettingsSection>
              <SettingsLinkRow
                href={`${base}/general`}
                icon={GearSixIcon}
                label="General"
                description="Name, identifier, timezone, estimates, and broader settings"
              />
              <SettingsLinkRow
                href={`${base}/members`}
                icon={UsersIcon}
                label="Members"
                description="Manage and invite team members"
                value={memberLabel}
              />
              <SettingsLinkRow
                href={`${base}/slack`}
                icon={BellIcon}
                label="Slack notifications"
                description="Configure notifications for this team"
                value="Off"
              />
            </SettingsSection>

            <SettingsSection title="Issues, projects and docs">
              <SettingsLinkRow
                href={`${base}/labels`}
                icon={TagSimpleIcon}
                label="Issue labels"
                description="Manage issue labels for this team"
                value="None"
              />
              <SettingsLinkRow
                href={`${base}/templates`}
                icon={StackIcon}
                label="Templates"
                description="Manage templates for issues, documents, and projects"
                value="None"
              />
              <SettingsLinkRow
                href={`${base}/recurring`}
                icon={TimerIcon}
                label="Recurring issues"
                description="Manage automatic issue creation on a schedule"
                value="None"
              />
            </SettingsSection>

            <SettingsSection title="Workflow">
              <SettingsLinkRow
                href={`${base}/statuses`}
                icon={CirclesThreePlusIcon}
                label="Issue statuses"
                description="Edit workflow statuses and categories"
                value={statusLabel}
              />
              <SettingsLinkRow
                href={`${base}/workflows`}
                icon={LightningIcon}
                label="Workflows & automations"
                description="Automations that apply to this team's issues and git workflows"
              />
              <SettingsLinkRow
                href={`${base}/triage`}
                icon={FunnelIcon}
                label="Triage"
                description="Streamline requests from the rest of your organization"
                value={team.triageEnabled ? "On" : "Off"}
              />
            </SettingsSection>

            <SettingsSection title="Cycles">
              <SettingsLinkRow
                href={`${base}/cycles`}
                icon={CubeIcon}
                label="Cycles"
                description="Focus your team's work over short, time-boxed windows"
                value="Off"
              />
            </SettingsSection>

            <SettingsSection title="AI & Agents">
              <SettingsLinkRow
                href={`${base}/agents`}
                icon={RobotIcon}
                label="Team agents"
                description="Add guidance for how agents should operate within this team"
              />
              <SettingsLinkRow
                href={`${base}/agent-skills`}
                icon={StackIcon}
                label="Agent skills"
                description="Agent skills shared with this team"
                value="None"
              />
              <SettingsLinkRow
                href={`${base}/project-updates`}
                icon={PulseIcon}
                label="Project updates"
                description="Automatically generate updates using recent activity and defined rules"
              />
              <SettingsLinkRow
                href={`${base}/thread-summaries`}
                icon={GitBranchIcon}
                label="Resolved thread summaries"
                description="Automatically generate summaries for resolved threads"
              />
            </SettingsSection>

            <SettingsSection title="Team hierarchy">
              <div className="bg-background/50 px-4 py-3.5">
                <p className="text-sm leading-snug text-muted-foreground">
                  Teams can be nested to reflect your team structure and to share
                  workflows and settings.
                </p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
                <p className="text-sm font-medium">Parent team</p>
                <span className="text-sm text-muted-foreground">
                  Available on Business
                </span>
              </div>
            </SettingsSection>

            {showDangerZone ? (
              <SettingsSection title="Danger zone">
                {showLeave ? (
                  <DangerRow
                    label="Leave team"
                    description="Remove yourself as a member of this team."
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          runAction(
                            () =>
                              leaveTeam({
                                workspaceId: team.workspaceId,
                                workspaceSlug,
                                teamId: team.id,
                              }),
                            "Left team"
                          )
                        }
                      >
                        Leave team…
                      </Button>
                    }
                  />
                ) : null}

                {showRetireRestore ? (
                  <DangerRow
                    label={
                      team.status === "retired" ? "Restore team" : "Retire team"
                    }
                    description={
                      team.status === "retired"
                        ? "Allow creating and updating issues in this team again."
                        : "Prevent creating and updating issues in this team while preserving all historical data."
                    }
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          runAction(
                            () =>
                              team.status === "retired"
                                ? restoreRetiredTeam({
                                    workspaceId: team.workspaceId,
                                    workspaceSlug,
                                    teamId: team.id,
                                  })
                                : retireTeam({
                                    workspaceId: team.workspaceId,
                                    workspaceSlug,
                                    teamId: team.id,
                                  }),
                            team.status === "retired"
                              ? "Team restored"
                              : "Team retired"
                          )
                        }
                      >
                        {team.status === "retired" ? "Restore…" : "Retire…"}
                      </Button>
                    }
                  />
                ) : null}

                {showDelete ? (
                  <DangerRow
                    label="Delete team"
                    description="Permanently delete this team and all its data, with a restoration window."
                    action={
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setConfirmName("")
                          setDeleteOpen(true)
                        }}
                      >
                        Delete…
                      </Button>
                    }
                  />
                ) : null}
              </SettingsSection>
            ) : null}
          </div>
        )}

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete team</DialogTitle>
              <DialogDescription>
                This soft-deletes <strong>{team.name}</strong>. Type the team
                name to confirm.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={team.name}
              autoFocus
              disabled={pending}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending || !confirmName.trim()}
                onClick={async () => {
                  const ok = await runAction(
                    () =>
                      softDeleteTeam({
                        workspaceId: team.workspaceId,
                        workspaceSlug,
                        teamId: team.id,
                        confirmName,
                      }),
                    "Team deleted"
                  )
                  if (ok) setDeleteOpen(false)
                }}
              >
                Delete team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsSubpage>
  )
}
