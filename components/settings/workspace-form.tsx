"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/app/settings-page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  cancelWorkspaceDeletion,
  removeWorkspaceLogo,
  scheduleWorkspaceDeletion,
  updateWorkspaceSettings,
  uploadWorkspaceLogo,
} from "@/lib/workspace/actions"
import {
  normalizeWorkspaceName,
  normalizeWorkspaceSlug,
} from "@/lib/workspace/schema"
import type { WorkspaceSettings } from "@/lib/workspace/types"
import { cn } from "@/lib/utils"
import { slugify } from "@/lib/slug"

const TOAST_ID = "workspace-settings"

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export function WorkspaceForm({
  initialWorkspace,
}: {
  initialWorkspace: WorkspaceSettings
}) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [workspace, setWorkspace] = React.useState(initialWorkspace)
  const [name, setName] = React.useState(initialWorkspace.name)
  const [slug, setSlug] = React.useState(initialWorkspace.slug)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )
  const workspaceRef = React.useRef(workspace)
  const requestIdsRef = React.useRef<Record<string, number>>({})

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [confirmName, setConfirmName] = React.useState("")

  React.useEffect(() => {
    setWorkspace(initialWorkspace)
    setName(initialWorkspace.name)
    setSlug(initialWorkspace.slug)
  }, [initialWorkspace])

  React.useEffect(() => {
    workspaceRef.current = workspace
  }, [workspace])

  function setKeyPending(key: string, pending: boolean) {
    setPendingKeys((prev) => {
      const next = new Set(prev)
      if (pending) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const isPending = (key: string) => pendingKeys.has(key)
  const readOnly = !workspace.canEdit

  async function commitField(
    key: "name" | "slug" | "fiscalYearStartMonth",
    rawValue: string | number
  ) {
    if (readOnly) {
      toast.error("Only owners and admins can edit workspace settings.", {
        id: TOAST_ID,
      })
      return
    }

    let nextValue: string | number = rawValue
    if (key === "name" && typeof rawValue === "string") {
      nextValue = normalizeWorkspaceName(rawValue)
      setName(nextValue)
    }
    if (key === "slug" && typeof rawValue === "string") {
      nextValue = normalizeWorkspaceSlug(rawValue || slugify(name))
      setSlug(String(nextValue))
    }

    const current = workspaceRef.current[key]
    if (nextValue === current) {
      if (key === "name") setName(String(current))
      if (key === "slug") setSlug(String(current))
      return
    }

    const requestSlug = workspaceRef.current.slug
    const requestId = (requestIdsRef.current[key] ?? 0) + 1
    requestIdsRef.current[key] = requestId
    setKeyPending(key, true)

    const previous = workspaceRef.current
    const optimistic = { ...previous, [key]: nextValue }
    workspaceRef.current = optimistic
    setWorkspace(optimistic)

    try {
      const result = await updateWorkspaceSettings(requestSlug, {
        [key]: nextValue,
      })

      if (requestIdsRef.current[key] !== requestId) return

      if (result.error) {
        workspaceRef.current = previous
        setWorkspace(previous)
        if (key === "name") setName(previous.name)
        if (key === "slug") setSlug(previous.slug)
        toast.error(result.error, { id: TOAST_ID })
        return
      }

      if (result.workspace) {
        workspaceRef.current = result.workspace
        setWorkspace(result.workspace)
        setName(result.workspace.name)
        setSlug(result.workspace.slug)
      }

      toast.success("Workspace settings saved", { id: TOAST_ID })

      if (result.redirectTo) {
        router.replace(result.redirectTo)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (error) {
      if (requestIdsRef.current[key] !== requestId) return
      workspaceRef.current = previous
      setWorkspace(previous)
      if (key === "name") setName(previous.name)
      if (key === "slug") setSlug(previous.slug)
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update workspace settings.",
        { id: TOAST_ID }
      )
    } finally {
      if (requestIdsRef.current[key] === requestId) {
        setKeyPending(key, false)
      }
    }
  }

  async function onLogoSelected(file: File | null) {
    if (!file) return
    if (readOnly) {
      toast.error("Only owners and admins can edit workspace settings.", {
        id: TOAST_ID,
      })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be 2MB or smaller.", { id: TOAST_ID })
      return
    }

    setKeyPending("logo", true)
    try {
      const body = new FormData()
      body.set("logo", file)
      const result = await uploadWorkspaceLogo(workspaceRef.current.slug, body)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.workspace) {
        workspaceRef.current = result.workspace
        setWorkspace(result.workspace)
      }
      toast.success("Logo updated", { id: TOAST_ID })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload logo.",
        { id: TOAST_ID }
      )
    } finally {
      setKeyPending("logo", false)
    }
  }

  async function onRemoveLogo() {
    if (readOnly) return
    setKeyPending("logo", true)
    try {
      const result = await removeWorkspaceLogo(workspaceRef.current.slug)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.workspace) {
        workspaceRef.current = result.workspace
        setWorkspace(result.workspace)
      }
      toast.success("Logo removed", { id: TOAST_ID })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove logo.",
        { id: TOAST_ID }
      )
    } finally {
      setKeyPending("logo", false)
    }
  }

  async function onScheduleDeletion() {
    setKeyPending("delete", true)
    try {
      const result = await scheduleWorkspaceDeletion(
        workspaceRef.current.slug,
        confirmName
      )
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.workspace) {
        workspaceRef.current = result.workspace
        setWorkspace(result.workspace)
      }
      setDeleteOpen(false)
      setConfirmName("")
      toast.success("Workspace scheduled for deletion", { id: TOAST_ID })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not schedule workspace deletion.",
        { id: TOAST_ID }
      )
    } finally {
      setKeyPending("delete", false)
    }
  }

  async function onCancelDeletion() {
    setKeyPending("delete", true)
    try {
      const result = await cancelWorkspaceDeletion(workspaceRef.current.slug)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.workspace) {
        workspaceRef.current = result.workspace
        setWorkspace(result.workspace)
      }
      toast.success("Workspace deletion canceled", { id: TOAST_ID })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not cancel workspace deletion.",
        { id: TOAST_ID }
      )
    } finally {
      setKeyPending("delete", false)
    }
  }

  return (
    <>
      <SettingsPage title="Workspace" width="narrow">
        <SettingsSection>
          <SettingsRow
            label="Logo"
            description="Recommended size is 256x256px"
            control={
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    event.target.value = ""
                    void onLogoSelected(file)
                  }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={readOnly || isPending("logo")}
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      aria-label="Workspace logo options"
                    >
                      <Avatar size="lg" className="size-10">
                        {workspace.logoUrl ? (
                          <AvatarImage
                            src={workspace.logoUrl}
                            alt={workspace.name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-violet-600 text-sm font-semibold text-white">
                          {workspace.name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => fileInputRef.current?.click()}
                    >
                      <PencilSimpleIcon />
                      Upload logo
                    </DropdownMenuItem>
                    {workspace.logoUrl ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => void onRemoveLogo()}
                      >
                        <TrashIcon />
                        Remove logo
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />

          <SettingsRow
            label="Name"
            control={
              <Input
                value={name}
                disabled={readOnly || isPending("name")}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => void commitField("name", name)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur()
                  }
                }}
                className="w-56"
                aria-label="Workspace name"
              />
            }
          />

          <SettingsRow
            label="URL"
            control={
              <div className="flex w-72 items-center overflow-hidden rounded-lg border border-input dark:bg-input/30">
                <span className="shrink-0 border-r border-input bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground">
                  {workspace.urlPrefix}
                </span>
                <Input
                  value={slug}
                  disabled={readOnly || isPending("slug")}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase())
                  }
                  onBlur={() => void commitField("slug", slug)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur()
                    }
                  }}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                  aria-label="Workspace URL"
                />
              </div>
            }
          />
        </SettingsSection>

        <SettingsSection title="Time & region">
          <SettingsRow
            label="First month of the fiscal year"
            description="Used when grouping projects and issues quarterly, half-yearly, and yearly."
            control={
              <Select
                value={String(workspace.fiscalYearStartMonth)}
                disabled={readOnly || isPending("fiscalYearStartMonth")}
                onValueChange={(value) =>
                  void commitField("fiscalYearStartMonth", Number(value))
                }
              >
                <SelectTrigger className="w-40" aria-label="Fiscal year start">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <SettingsRow
            label="Region"
            description="Set when a workspace is created and cannot be changed."
            control={
              <p className="text-sm text-muted-foreground">{workspace.region}</p>
            }
          />
        </SettingsSection>

        <SettingsSection title="Member onboarding">
          <SettingsRow
            label="Welcome message"
            className="opacity-60"
            control={
              <p className="text-sm text-muted-foreground">
                Available on Enterprise
              </p>
            }
          />
          <SettingsRow
            label="Default home view"
            className="opacity-60"
            control={
              <p className="text-sm text-muted-foreground">
                Available on Enterprise
              </p>
            }
          />
        </SettingsSection>

        <SettingsSection title="Danger zone">
          <SettingsRow
            label="Delete workspace"
            description={
              workspace.deletionScheduledAt
                ? `Scheduled for deletion on ${new Date(
                    workspace.deletionScheduledAt
                  ).toLocaleString()}.`
                : "Schedule workspace to be permanently deleted"
            }
            control={
              workspace.deletionScheduledAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!workspace.canDelete || isPending("delete")}
                  onClick={() => void onCancelDeletion()}
                  className="text-foreground"
                >
                  Cancel deletion
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!workspace.canDelete || isPending("delete")}
                  onClick={() => setDeleteOpen(true)}
                  className={cn(
                    "text-destructive hover:bg-destructive/10 hover:text-destructive"
                  )}
                >
                  Delete workspace
                </Button>
              )
            }
          />
        </SettingsSection>
      </SettingsPage>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setConfirmName("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This schedules <strong>{workspace.name}</strong> for permanent
              deletion. Type the workspace name to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={workspace.name}
            aria-label="Confirm workspace name"
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                isPending("delete") ||
                normalizeWorkspaceName(confirmName) !== workspace.name
              }
              onClick={() => void onScheduleDeletion()}
            >
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
