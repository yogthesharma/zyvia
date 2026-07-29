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
  checkEmailAvailability,
  leaveWorkspace,
  removeAvatar,
  requestEmailChange,
  updateProfileSettings,
  uploadAvatar,
} from "@/lib/profile/actions"
import { normalizeUsername } from "@/lib/profile/schema"
import type { ProfileSettings } from "@/lib/profile/types"

const TOAST_ID = "profile-save"

function initials(name: string, email: string) {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
  if (fromName) return fromName
  return (email[0] ?? "?").toUpperCase()
}

export function ProfileForm({
  initialProfile,
  workspaceSlug,
  workspaceName,
}: {
  initialProfile: ProfileSettings
  workspaceSlug: string
  workspaceName: string
}) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [profile, setProfile] = React.useState(initialProfile)
  const [fullName, setFullName] = React.useState(initialProfile.fullName)
  const [title, setTitle] = React.useState(initialProfile.title)
  const [username, setUsername] = React.useState(initialProfile.username)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )
  const profileRef = React.useRef(profile)
  const requestIdsRef = React.useRef<Record<string, number>>({})

  const [emailOpen, setEmailOpen] = React.useState(false)
  const [newEmail, setNewEmail] = React.useState("")
  const [emailChecked, setEmailChecked] = React.useState(false)
  const [checkedEmail, setCheckedEmail] = React.useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = React.useState(false)

  React.useEffect(() => {
    setProfile(initialProfile)
    setFullName(initialProfile.fullName)
    setTitle(initialProfile.title)
    setUsername(initialProfile.username)
  }, [initialProfile])

  React.useEffect(() => {
    profileRef.current = profile
  }, [profile])

  function setKeyPending(key: string, pending: boolean) {
    setPendingKeys((prev) => {
      const next = new Set(prev)
      if (pending) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const isPending = (key: string) => pendingKeys.has(key)

  async function saveField(
    key: "fullName" | "title" | "username",
    rawValue: string
  ) {
    const value =
      key === "username"
        ? normalizeUsername(rawValue)
        : rawValue.trim().replace(/\s+/g, " ")

    const current = profileRef.current[key]
    if (value === current) {
      if (key === "fullName") setFullName(current)
      if (key === "title") setTitle(current)
      if (key === "username") setUsername(current)
      return
    }

    const requestId = (requestIdsRef.current[key] ?? 0) + 1
    requestIdsRef.current[key] = requestId
    const previous = profileRef.current

    if (key === "fullName") setFullName(value)
    if (key === "title") setTitle(value)
    if (key === "username") setUsername(value)

    setKeyPending(key, true)

    try {
      const result = await updateProfileSettings({ [key]: value })
      if (requestIdsRef.current[key] !== requestId) return

      if (result.error) {
        if (key === "fullName") setFullName(previous.fullName)
        if (key === "title") setTitle(previous.title)
        if (key === "username") setUsername(previous.username)
        toast.error(result.error, { id: TOAST_ID })
        return
      }

      if (result.profile) {
        profileRef.current = result.profile
        setProfile(result.profile)
        setFullName(result.profile.fullName)
        setTitle(result.profile.title)
        setUsername(result.profile.username)
      }
      toast.success("Profile saved", { id: TOAST_ID })
    } catch (error) {
      if (requestIdsRef.current[key] !== requestId) return
      if (key === "fullName") setFullName(previous.fullName)
      if (key === "title") setTitle(previous.title)
      if (key === "username") setUsername(previous.username)
      toast.error(
        error instanceof Error ? error.message : "Could not update profile.",
        { id: TOAST_ID }
      )
    } finally {
      if (requestIdsRef.current[key] === requestId) {
        setKeyPending(key, false)
      }
    }
  }

  async function onAvatarSelected(file: File | null) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be 2MB or smaller.", { id: TOAST_ID })
      return
    }

    const body = new FormData()
    body.set("avatar", file)
    setKeyPending("avatar", true)
    try {
      const result = await uploadAvatar(body)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.profile) {
        profileRef.current = result.profile
        setProfile(result.profile)
      }
      toast.success("Avatar updated", { id: TOAST_ID })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload avatar.",
        { id: TOAST_ID }
      )
    } finally {
      setKeyPending("avatar", false)
    }
  }

  async function onRemoveAvatar() {
    setKeyPending("avatar", true)
    try {
      const result = await removeAvatar()
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.profile) {
        profileRef.current = result.profile
        setProfile(result.profile)
      }
      toast.success("Avatar removed", { id: TOAST_ID })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove avatar.",
        { id: TOAST_ID }
      )
    } finally {
      setKeyPending("avatar", false)
    }
  }

  async function onCheckEmail() {
    setKeyPending("email", true)
    setEmailChecked(false)
    setCheckedEmail(null)
    try {
      const result = await checkEmailAvailability(newEmail)
      if (result.error) {
        toast.error(result.error, { id: "profile-email" })
        return
      }
      const normalized = newEmail.trim().toLowerCase()
      setCheckedEmail(normalized)
      setEmailChecked(true)
      toast.success("Email is available", { id: "profile-email" })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not check that email address.",
        { id: "profile-email" }
      )
    } finally {
      setKeyPending("email", false)
    }
  }

  async function onConfirmEmailChange() {
    const normalized = newEmail.trim().toLowerCase()
    if (!emailChecked || checkedEmail !== normalized) {
      setEmailChecked(false)
      setCheckedEmail(null)
      toast.error("Please check this email address again.", {
        id: "profile-email",
      })
      return
    }

    setKeyPending("email", true)
    try {
      const result = await requestEmailChange(newEmail)
      if (result.error) {
        toast.error(result.error, { id: "profile-email" })
        setEmailChecked(false)
        setCheckedEmail(null)
        return
      }

      setEmailOpen(false)
      setNewEmail("")
      setEmailChecked(false)
      setCheckedEmail(null)
      toast.success(
        "Verification link sent. Your current email stays active until you confirm.",
        { id: "profile-email" }
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the email change.",
        { id: "profile-email" }
      )
      setEmailChecked(false)
      setCheckedEmail(null)
    } finally {
      setKeyPending("email", false)
    }
  }

  async function onLeaveWorkspace() {
    setKeyPending("leave", true)
    try {
      const result = await leaveWorkspace(workspaceSlug)
      if (result.error) {
        toast.error(result.error, { id: "profile-leave" })
        return
      }

      setLeaveOpen(false)
      toast.success(`Left ${workspaceName}`, { id: "profile-leave" })
      router.push(result.redirectTo ?? "/onboarding/workspace")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not leave workspace.",
        { id: "profile-leave" }
      )
    } finally {
      setKeyPending("leave", false)
    }
  }

  return (
    <>
      <SettingsPage title="Profile" width="narrow">
        <SettingsSection>
          <SettingsRow
            label="Profile picture"
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
                    void onAvatarSelected(file)
                  }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isPending("avatar")}
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      aria-label="Profile picture options"
                    >
                      <Avatar size="lg" className="size-10">
                        {profile.avatarUrl ? (
                          <AvatarImage
                            src={profile.avatarUrl}
                            alt={profile.fullName || profile.email}
                          />
                        ) : null}
                        <AvatarFallback>
                          {initials(profile.fullName, profile.email)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-40">
                    <DropdownMenuItem
                      disabled={isPending("avatar")}
                      onSelect={(event) => {
                        event.preventDefault()
                        fileInputRef.current?.click()
                      }}
                    >
                      <PencilSimpleIcon />
                      Change avatar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!profile.avatarUrl || isPending("avatar")}
                      onSelect={(event) => {
                        event.preventDefault()
                        void onRemoveAvatar()
                      }}
                    >
                      <TrashIcon />
                      Remove avatar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />

          <SettingsRow
            label="Email"
            control={
              <div className="flex items-center gap-1.5">
                <span className="max-w-[220px] truncate text-sm">
                  {profile.email || "No email on file"}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Change email"
                  disabled={!profile.email}
                  onClick={() => {
                    setNewEmail("")
                    setEmailChecked(false)
                    setCheckedEmail(null)
                    setEmailOpen(true)
                  }}
                >
                  <PencilSimpleIcon className="size-3.5" />
                </Button>
              </div>
            }
          />

          <SettingsRow
            label="Full name"
            control={
              <Input
                value={fullName}
                disabled={isPending("fullName")}
                onChange={(event) => setFullName(event.target.value)}
                onBlur={() => void saveField("fullName", fullName)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
                className="h-8 w-56"
                maxLength={80}
              />
            }
          />

          <SettingsRow
            label="Title"
            description="Your job title or role"
            control={
              <Input
                value={title}
                placeholder="Software engineer"
                disabled={isPending("title")}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => void saveField("title", title)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
                className="h-8 w-56"
                maxLength={80}
              />
            }
          />

          <SettingsRow
            label="Username"
            description="One word, like a nickname or first name"
            control={
              <Input
                value={username}
                disabled={isPending("username")}
                onChange={(event) => setUsername(event.target.value)}
                onBlur={() => void saveField("username", username)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
                className="h-8 w-56"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Workspace access">
          <SettingsRow
            label="Remove yourself from workspace"
            description={`Leave ${workspaceName}. You can be re-invited later.`}
            control={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending("leave")}
                onClick={() => setLeaveOpen(true)}
              >
                Leave workspace
              </Button>
            }
          />
        </SettingsSection>
      </SettingsPage>

      <Dialog
        open={emailOpen}
        onOpenChange={(open) => {
          setEmailOpen(open)
          if (!open) {
            setNewEmail("")
            setEmailChecked(false)
            setCheckedEmail(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>
              If you’d like to change the email address for your account, we’ll
              send a verification link to your new email address. This change
              will apply across all workspaces that you are a member of.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Please check if the new email address is tied to an existing account
            before proceeding with the change.
          </p>

          <div className="space-y-2">
            <label htmlFor="new-email" className="text-sm font-medium">
              Enter the new email address you’d like to use.
            </label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              placeholder="New email address"
              autoComplete="email"
              disabled={isPending("email")}
              onChange={(event) => {
                setNewEmail(event.target.value)
                setEmailChecked(false)
                setCheckedEmail(null)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                if (emailChecked) void onConfirmEmailChange()
                else if (newEmail.trim()) void onCheckEmail()
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending("email")}
              onClick={() => setEmailOpen(false)}
            >
              Cancel
            </Button>
            {emailChecked ? (
              <Button
                type="button"
                disabled={isPending("email")}
                onClick={() => void onConfirmEmailChange()}
              >
                {isPending("email") ? "Sending…" : "Send verification link"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isPending("email") || !newEmail.trim()}
                onClick={() => void onCheckEmail()}
              >
                {isPending("email")
                  ? "Checking…"
                  : "Check for existing account"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Leave workspace?</DialogTitle>
            <DialogDescription>
              You’ll lose access to {workspaceName} until someone invites you
              again. Issues you created will remain in the workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending("leave")}
              onClick={() => setLeaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending("leave")}
              onClick={() => void onLeaveWorkspace()}
            >
              {isPending("leave") ? "Leaving…" : "Leave workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
